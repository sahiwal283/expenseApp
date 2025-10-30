import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { zohoMultiAccountService } from '../services/zohoMultiAccountService';
import { expenseService } from '../services/ExpenseService';
import { DuplicateDetectionService } from '../services/DuplicateDetectionService';
import { ExpenseAuditService } from '../services/ExpenseAuditService';
import { asyncHandler, ValidationError } from '../utils/errors';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }, // 10MB default (increased for phone photos)
  fileFilter: (req, file, cb) => {
    // Accept common image formats and PDFs (including phone camera formats)
    const allowedExtensions = /jpeg|jpg|png|pdf|heic|heif|webp/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    
    // Accept any image MIME type (image/*) or PDF
    // This handles phone cameras which may send image/heic, image/heif, image/x-png, etc.
    const mimetypeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

    if (extname && mimetypeOk) {
      console.log(`[Upload] Accepting file: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    } else {
      console.warn(`[Upload] Rejected file: ${file.originalname} (ext: ${path.extname(file.originalname)}, mime: ${file.mimetype})`);
      cb(new Error('Only images (JPEG, PNG, HEIC, WebP) and PDF files are allowed'));
    }
  }
});

// Image preprocessing function to improve OCR accuracy
async function preprocessImage(inputPath: string): Promise<Buffer> {
  try {
    console.log('[OCR] Preprocessing image with Sharp...');
    
    // Read and preprocess the image for optimal OCR
    const processedImage = await sharp(inputPath)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen text edges
      .median(3) // Reduce noise with median filter
      .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
      .toBuffer();
    
    console.log('[OCR] Image preprocessing completed');
    return processedImage;
    
  } catch (error: any) {
    console.error('[OCR] Preprocessing error:', error.message);
    // Return original image if preprocessing fails
    return fs.readFileSync(inputPath);
  }
}

// Enhanced OCR processing function with image preprocessing
async function processOCR(filePath: string): Promise<{
  text: string;
  confidence: number;
  structured: any;
}> {
  let worker = null;
  try {
    console.log('[OCR] Starting enhanced Tesseract OCR processing for:', filePath);
    
    // Preprocess the image for better OCR accuracy
    const preprocessedImage = await preprocessImage(filePath);
    
    // Create Tesseract worker with optimized configuration
    worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(1)}%`);
        }
      }
    });
    
    // Configure Tesseract for receipt processing
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/:- '
    });
    
    // Process the preprocessed image
    const { data } = await worker.recognize(preprocessedImage);
    
    console.log(`[OCR] Tesseract completed`);
    console.log(`[OCR] Confidence: ${data.confidence.toFixed(2)}%`);
    console.log(`[OCR] Extracted text length: ${data.text.length} characters`);
    
    // Extract structured data from text
    const structured = extractStructuredData(data.text);
    
    return {
      text: data.text || '',
      confidence: data.confidence / 100 || 0, // Convert to 0-1 range
      structured: structured
    };
    
  } catch (error: any) {
    console.error('[OCR] Tesseract processing error:', error.message);
    return {
      text: '',
      confidence: 0,
      structured: {}
    };
  } finally {
    // Always terminate the worker
    if (worker) {
      await worker.terminate();
    }
  }
}

// Enhanced structured data extraction from OCR text
function extractStructuredData(text: string): any {
  const structured: any = {
    merchant: null,
    total: null,
    date: null,
    category: null,
    location: null
  };
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const textLower = text.toLowerCase();
  
  console.log('[OCR] Extracting structured data from text...');
  
  // Extract merchant (first substantial line that's not a number or common header)
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    // Skip lines that are just numbers, dates, or common receipt headers
    if (trimmed.length > 3 && 
        !/^\d+$/.test(trimmed) && 
        !/^receipt$/i.test(trimmed) &&
        !/^invoice$/i.test(trimmed) &&
        !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed)) {
      structured.merchant = trimmed;
      console.log(`[OCR] Detected merchant: ${trimmed}`);
      break;
    }
  }
  
  // Enhanced amount extraction with multiple patterns
  const amountPatterns = [
    /total[\s:]*\$?\s*(\d+[.,]\d{2})/i,
    /amount[\s:]*\$?\s*(\d+[.,]\d{2})/i,
    /balance[\s:]*\$?\s*(\d+[.,]\d{2})/i,
    /grand[\s]+total[\s:]*\$?\s*(\d+[.,]\d{2})/i,
    /\$\s*(\d+[.,]\d{2})/,
    /(\d+[.,]\d{2})\s*(?:USD|usd)/,
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      // Only accept reasonable amounts (between $0.01 and $10,000)
      if (amount >= 0.01 && amount <= 10000) {
        structured.total = amount;
        console.log(`[OCR] Detected amount: $${amount}`);
        break;
      }
    }
  }
  
  // Enhanced date extraction with multiple formats
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,     // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2})/,     // MM/DD/YY
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,     // YYYY/MM/DD
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}/i, // Month DD, YYYY
    /\d{1,2}[\s]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{4}/i   // DD Month YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      structured.date = match[0];
      console.log(`[OCR] Detected date: ${match[0]}`);
      break;
    }
  }
  
  // Enhanced category detection with more keywords
  const categoryKeywords = {
    'Transportation': ['hertz', 'rental', 'car rental', 'vehicle', 'uber', 'lyft', 'taxi', 'cab', 'metro', 'transit', 'parking', 'toll'],
    'Hotels': ['hotel', 'motel', 'inn', 'resort', 'marriott', 'hilton', 'hyatt', 'holiday inn', 'best western', 'lodging', 'accommodation'],
    'Meals': ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'grill', 'kitchen', 'bar', 'pub', 'food', 'dining', 'breakfast', 'lunch', 'dinner'],
    'Flights': ['airline', 'airways', 'flight', 'aviation', 'airport'],
    'Supplies': ['office', 'supply', 'staples', 'depot', 'store', 'shop'],
    'Entertainment': ['theater', 'cinema', 'movie', 'show', 'event', 'ticket']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      structured.category = category;
      console.log(`[OCR] Detected category: ${category}`);
      break;
    }
  }
  
  // Try to extract location/address
  const locationPatterns = [
    /\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive)/i,
    /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/  // City, ST 12345
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      structured.location = match[0];
      console.log(`[OCR] Detected location: ${match[0]}`);
      break;
    }
  }
  
  return structured;
}

// Helper function to convert numeric strings to numbers
const normalizeExpense = (expense: any) => {
  // Parse duplicate_check if it's a string (shouldn't be, but just in case)
  let duplicateCheckValue = expense.duplicate_check;
  if (typeof duplicateCheckValue === 'string') {
    try {
      duplicateCheckValue = JSON.parse(duplicateCheckValue);
    } catch (e) {
      console.error('[Normalize] Failed to parse duplicate_check:', e);
      duplicateCheckValue = null;
    }
  }
  
  const normalized: any = {
    id: expense.id,
    userId: expense.user_id,
    tradeShowId: expense.event_id || null,
    amount: expense.amount ? parseFloat(expense.amount) : null,
    category: expense.category,
    merchant: expense.merchant,
    date: expense.date,
    description: expense.description,
    cardUsed: expense.card_used || null,
    receiptUrl: expense.receipt_url || null,
    reimbursementRequired: expense.reimbursement_required,
    reimbursementStatus: expense.reimbursement_status || null,
    status: expense.status,
    zohoEntity: expense.zoho_entity || null,
    zohoExpenseId: expense.zoho_expense_id || null,
    location: expense.location || null,
    ocrText: expense.ocr_text || null,
    createdAt: expense.created_at,
    updatedAt: expense.updated_at,
    duplicateCheck: duplicateCheckValue || null,
    // Include pre-fetched JOIN fields if present
    user_name: expense.user_name,
    event_name: expense.event_name,
  };
  
  // Debug logging for duplicate check
  if (duplicateCheckValue) {
    console.log(`[Normalize] Expense ${expense.id} HAS duplicateCheck:`, Array.isArray(duplicateCheckValue), duplicateCheckValue.length);
  }
  
  return normalized;
};

router.use(authenticateToken);

// OCR processing endpoint (preview only, no expense creation)
router.post('/ocr', upload.single('receipt'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[OCR Preview] Processing file: ${req.file.filename}`);

    // Perform OCR using EasyOCR service
    const ocrResult = await processOCR(req.file.path);
    
    if (!ocrResult.text || ocrResult.confidence === 0) {
      console.warn('[OCR Preview] OCR returned no results');
      // Clean up the uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ 
        error: 'Failed to process receipt. Please try again or enter manually.',
        details: 'No text could be extracted from the image'
      });
    }

    console.log(`[OCR Preview] Success - Confidence: ${(ocrResult.confidence * 100).toFixed(2)}%`);
    
    // Return the temporary receipt URL and extracted data
    const tempReceiptUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      ocrText: ocrResult.text,
      confidence: ocrResult.confidence,
      structured: ocrResult.structured,
      receiptUrl: tempReceiptUrl,
      merchant: ocrResult.structured?.merchant || '',
      amount: ocrResult.structured?.total || 0,
      date: ocrResult.structured?.date || '',
      category: ocrResult.structured?.category || '',
      location: ocrResult.structured?.location || ''
    });
  } catch (error: any) {
    console.error('[OCR Preview] Error:', error.message);
    
    // Clean up the uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process receipt. Please try again or enter manually.',
      details: error.message
    });
  }
});

// Get all expenses
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { event_id, user_id, status } = req.query;
  
  // Build filters from query params
  const filters: any = {};
  if (event_id) filters.eventId = event_id as string;
  if (user_id) filters.userId = user_id as string;
  if (status) filters.status = status as string;
  
  // Get expenses with user/event details (optimized with JOINs - no N+1 queries!)
  const expenses = await expenseService.getExpensesWithDetails(filters);
  
  // Normalize and return
  const normalizedExpenses = expenses.map((expense: any) => ({
    ...normalizeExpense(expense),
    user_name: expense.user_name,
    event_name: expense.event_name
  }));
  
  res.json(normalizedExpenses);
}));

// Get expense by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  // Get expense with user/event details (optimized with JOINs - no extra queries!)
  const expense = await expenseService.getExpenseByIdWithDetails(id);
  
  res.json({
    ...normalizeExpense(expense),
    user_name: expense.user_name,
    event_name: expense.event_name
  });
}));

// Create expense with optional receipt upload and OCR
router.post('/', upload.single('receipt'), asyncHandler(async (req: AuthRequest, res) => {
  const {
    event_id,
    category,
    merchant,
    amount,
    date,
    description,
    card_used,
    reimbursement_required,
    location,
    zoho_entity,
    receipt_url // Accept pre-uploaded receipt URL (from OCR v2)
  } = req.body;

  let receiptUrl: string | undefined = receipt_url || undefined;

  // Validate that user is a participant of the event (unless admin/accountant/developer/coordinator)
  if (req.user!.role !== 'admin' && req.user!.role !== 'accountant' && req.user!.role !== 'developer' && req.user!.role !== 'coordinator') {
    const participantCheck = await query(
      `SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2`,
      [event_id, req.user!.id]
    );
    
    if (participantCheck.rows.length === 0) {
      throw new ValidationError('You can only submit expenses to events where you are a participant');
    }
  }

  // Process uploaded receipt with OCR (only if file is provided and no receipt_url)
  if (req.file && !receipt_url) {
    receiptUrl = `/uploads/${req.file.filename}`;
    
    // Perform OCR
    try {
      const ocrResult = await processOCR(req.file.path);
      console.log(`Receipt OCR completed with ${(ocrResult.confidence * 100).toFixed(2)}% confidence`);
      // OCR data stored in receipt metadata (future enhancement)
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError);
      // Continue expense creation even if OCR fails
    }
  }

  // Create expense using service layer
  const expense = await expenseService.createExpense(req.user!.id, {
    eventId: event_id,
    date,
    merchant,
    amount: parseFloat(amount),
    category,
    description,
    location,
    cardUsed: card_used,
    receiptUrl,
    reimbursementRequired: reimbursement_required === 'true' || reimbursement_required === true,
    zohoEntity: zoho_entity || undefined
  });

  // Check for potential duplicates
  const duplicates = await DuplicateDetectionService.checkForDuplicates(
    merchant,
    parseFloat(amount),
    date,
    req.user!.id,
    expense.id
  );

  // Update expense with duplicate warnings if found
  if (duplicates.length > 0) {
    await query(
      'UPDATE expenses SET duplicate_check = $1 WHERE id = $2',
      [JSON.stringify(duplicates), expense.id]
    );
    console.log(`[DuplicateCheck] Found ${duplicates.length} potential duplicate(s) for expense #${expense.id}`);
  }

  // Log entity assignment status
  const entityStatus = expense.zoho_entity ? `assigned to ${expense.zoho_entity}` : 'unassigned';
  console.log(`[Zoho] Expense created (${entityStatus}). Entity can be assigned in Approvals page.`);

  // Log expense creation in audit trail
  await ExpenseAuditService.logChange(
    expense.id,
    req.user!.id,
    req.user!.username || 'Unknown User',
    'created',
    {
      merchant: { old: null, new: expense.merchant },
      amount: { old: null, new: expense.amount },
      date: { old: null, new: expense.date },
      category: { old: null, new: expense.category }
    }
  );

  // Include duplicate warnings in response
  const responseExpense = normalizeExpense(expense);
  if (duplicates.length > 0) {
    responseExpense.duplicate_check = duplicates;
  }

  res.status(201).json(responseExpense);
}));

// Update expense
router.put('/:id', upload.single('receipt'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const {
    event_id,
    category,
    merchant,
    amount,
    date,
    description,
    card_used,
    reimbursement_required,
    location,
    zoho_entity
  } = req.body;

  let receiptUrl = undefined;

  // Validate that user is a participant if changing event (unless admin/accountant/developer/coordinator)
  if (event_id && req.user!.role !== 'admin' && req.user!.role !== 'accountant' && req.user!.role !== 'developer' && req.user!.role !== 'coordinator') {
    const participantCheck = await query(
      `SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2`,
      [event_id, req.user!.id]
    );
    
    if (participantCheck.rows.length === 0) {
      throw new ValidationError('You can only assign expenses to events where you are a participant');
    }
  }

  // Process uploaded receipt with OCR if provided
  if (req.file) {
    receiptUrl = `/uploads/${req.file.filename}`;
    
    // Perform OCR
    try {
      const ocrResult = await processOCR(req.file.path);
      console.log(`Receipt OCR completed with ${(ocrResult.confidence * 100).toFixed(2)}% confidence`);
    } catch (ocrError) {
      console.error('OCR processing failed during update:', ocrError);
      // Continue with update even if OCR fails
    }
  }

  // Get old expense data for audit trail
  const oldExpenseResult = await query('SELECT * FROM expenses WHERE id = $1', [id]);
  const oldExpense = oldExpenseResult.rows[0];

  // Update expense using service layer (handles authorization)
  const expense = await expenseService.updateExpense(
    id,
    req.user!.id,
    req.user!.role,
    {
      eventId: event_id,
      date,
      merchant,
      amount: amount ? parseFloat(amount) : undefined,
      category,
      description,
      location,
      cardUsed: card_used,
      receiptUrl,
      reimbursementRequired: reimbursement_required !== undefined 
        ? (reimbursement_required === 'true' || reimbursement_required === true)
        : undefined,
      zohoEntity: zoho_entity
    }
  );

  // Log changes in audit trail
  if (oldExpense) {
    const changes = ExpenseAuditService.detectChanges(
      oldExpense,
      {
        merchant: expense.merchant,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        location: expense.location,
        card_used: expense.card_used,
        reimbursement_required: expense.reimbursement_required,
        zoho_entity: expense.zoho_entity
      },
      ['merchant', 'amount', 'date', 'category', 'description', 'location', 'card_used', 'reimbursement_required', 'zoho_entity']
    );

    if (Object.keys(changes).length > 0) {
      await ExpenseAuditService.logChange(
        id,
        req.user!.id,
        req.user!.username || 'Unknown User',
        'updated',
        changes
      );
    }
  }

  // Always check for potential duplicates on update
  const duplicates = await DuplicateDetectionService.checkForDuplicates(
    merchant || expense.merchant,
    amount ? parseFloat(amount) : expense.amount,
    date || expense.date,
    req.user!.id,
    id
  );

  // Update expense with duplicate warnings
  if (duplicates.length > 0) {
    await query(
      'UPDATE expenses SET duplicate_check = $1 WHERE id = $2',
      [JSON.stringify(duplicates), id]
    );
    console.log(`[DuplicateCheck] Found ${duplicates.length} potential duplicate(s) for expense #${id}`);
    
    // Include in response
    (expense as any).duplicate_check = duplicates;
  } else {
    // Clear duplicates if no longer matching
    await query(
      'UPDATE expenses SET duplicate_check = NULL WHERE id = $1',
      [id]
    );
  }

  console.log(`Successfully updated expense ${id}`);
  res.json(normalizeExpense(expense));
}));

// Update expense status (pending/approved/rejected/needs further review) - NEW endpoint for detail modal
router.patch('/:id/status', authorize('admin', 'accountant', 'developer'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected', 'needs further review'].includes(status)) {
    throw new ValidationError('Invalid status. Must be "pending", "approved", "rejected", or "needs further review"');
  }

  // Get old status for audit trail
  const oldStatusResult = await query('SELECT status FROM expenses WHERE id = $1', [id]);
  const oldStatus = oldStatusResult.rows[0]?.status;

  // Update status using service layer
  const expense = await expenseService.updateExpenseStatus(
    id,
    status,
    req.user!.role
  );

  // Log status change in audit trail
  if (oldStatus && oldStatus !== status) {
    await ExpenseAuditService.logChange(
      id,
      req.user!.id,
      req.user!.username || 'Unknown User',
      'status_changed',
      {
        status: { old: oldStatus, new: status }
      }
    );
  }

  res.json(normalizeExpense(expense));
}));

// Approve/Reject expense (accountant/admin only) - LEGACY endpoint, kept for backwards compatibility
router.patch('/:id/review', authorize('admin', 'accountant', 'developer'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new ValidationError('Invalid status. Must be "approved" or "rejected"');
  }

  // Update status using service layer
  const expense = await expenseService.updateExpenseStatus(
    id,
    status,
    req.user!.role
  );

  res.json(normalizeExpense(expense));
}));

// Assign Zoho entity (accountant only) - NO AUTO-PUSH
router.patch('/:id/entity', authorize('admin', 'accountant', 'developer'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { zoho_entity } = req.body;

  // Get old entity for audit trail
  const oldEntityResult = await query('SELECT zoho_entity FROM expenses WHERE id = $1', [id]);
  const oldEntity = oldEntityResult.rows[0]?.zoho_entity;

  // Assign entity using service layer
  const expense = await expenseService.assignZohoEntity(id, zoho_entity, req.user!.role);

  console.log(`[Entity Assignment] Entity "${zoho_entity}" assigned to expense ${id} (manual push required)`);

  // Log entity assignment in audit trail
  await ExpenseAuditService.logChange(
    id,
    req.user!.id,
    req.user!.username || 'Unknown User',
    'entity_assigned',
    {
      zoho_entity: { old: oldEntity || null, new: zoho_entity }
    }
  );

  // Check for potential duplicates
  const duplicates = await DuplicateDetectionService.checkForDuplicates(
    expense.merchant,
    expense.amount,
    expense.date,
    req.user!.id,
    id
  );

  // Update expense with duplicate warnings
  if (duplicates.length > 0) {
    await query(
      'UPDATE expenses SET duplicate_check = $1 WHERE id = $2',
      [JSON.stringify(duplicates), id]
    );
    console.log(`[DuplicateCheck] Found ${duplicates.length} potential duplicate(s) for expense #${id}`);
    (expense as any).duplicate_check = duplicates;
  } else {
    await query(
      'UPDATE expenses SET duplicate_check = NULL WHERE id = $1',
      [id]
    );
  }

  res.json(normalizeExpense(expense));
}));

// Manual push to Zoho Books (accountant/admin only)
router.post('/:id/push-to-zoho', authorize('admin', 'accountant', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get expense with full details
    const result = await query(
      `SELECT * FROM expenses WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = result.rows[0];

    // Check if already pushed to Zoho
    if (expense.zoho_expense_id) {
      return res.status(400).json({ 
        error: 'Expense already pushed to Zoho Books',
        zoho_expense_id: expense.zoho_expense_id
      });
    }

    // Check if entity is assigned
    if (!expense.zoho_entity) {
      return res.status(400).json({ 
        error: 'No entity assigned to this expense. Please assign an entity first.'
      });
    }

    // Check if entity has Zoho configuration
    if (!zohoMultiAccountService.isConfiguredForEntity(expense.zoho_entity)) {
      console.log(`[Zoho:Push] Entity "${expense.zoho_entity}" is not configured for Zoho integration`);
      return res.status(400).json({ 
        error: `Entity "${expense.zoho_entity}" does not have Zoho Books integration configured`
      });
    }

    // Get user and event details for Zoho submission
    const userResult = await query('SELECT name FROM users WHERE id = $1', [expense.user_id]);
    const eventResult = await query('SELECT name, start_date, end_date FROM events WHERE id = $1', [expense.event_id]);
    
    const userName = userResult.rows[0]?.name || 'Unknown User';
    const eventName = eventResult.rows[0]?.name || undefined;
    const eventStartDate = eventResult.rows[0]?.start_date || undefined;
    const eventEndDate = eventResult.rows[0]?.end_date || undefined;

    // Prepare receipt file path (if exists)
    let receiptPath = undefined;
    if (expense.receipt_url) {
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      receiptPath = path.join(uploadDir, path.basename(expense.receipt_url));
    }

    console.log(`[Zoho:ManualPush] Pushing expense ${id} to ${expense.zoho_entity} Zoho Books...`);

    // Submit to Zoho Books synchronously (wait for response)
    const zohoResult = await zohoMultiAccountService.createExpense(expense.zoho_entity, {
      expenseId: expense.id,
      date: expense.date,
      amount: parseFloat(expense.amount),
      category: expense.category,
      merchant: expense.merchant,
      description: expense.description || undefined,
      userName: userName,
      eventName: eventName,
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
      receiptPath: receiptPath,
      reimbursementRequired: expense.reimbursement_required,
    });

    if (zohoResult.success) {
      const mode = zohoResult.mock ? 'MOCK' : 'REAL';
      console.log(`[Zoho:ManualPush:${mode}] Expense ${expense.id} submitted successfully. Zoho ID: ${zohoResult.zohoExpenseId}`);
      
      // Store Zoho expense ID in database
      if (zohoResult.zohoExpenseId) {
        await query('UPDATE expenses SET zoho_expense_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
          [zohoResult.zohoExpenseId, expense.id]
        );
      }

      // Log Zoho push in audit trail
      await ExpenseAuditService.logChange(
        expense.id,
        req.user!.id,
        req.user!.username || 'Unknown User',
        'pushed_to_zoho',
        {
          zoho_entity: { old: null, new: expense.zoho_entity },
          zoho_expense_id: { old: null, new: zohoResult.zohoExpenseId }
        }
      );

      // Return updated expense
      const updatedResult = await query('SELECT * FROM expenses WHERE id = $1', [id]);
      return res.json({
        success: true,
        message: `Expense pushed to ${expense.zoho_entity} Zoho Books successfully`,
        zoho_expense_id: zohoResult.zohoExpenseId,
        expense: normalizeExpense(updatedResult.rows[0])
      });
    } else {
      console.error(`[Zoho:ManualPush] Failed to submit expense ${expense.id}: ${zohoResult.error}`);
      return res.status(500).json({ 
        error: `Failed to push to Zoho Books: ${zohoResult.error}`
      });
    }
  } catch (error) {
    console.error('[Zoho:ManualPush] Error pushing expense to Zoho:', error);
    res.status(500).json({ error: 'Internal server error while pushing to Zoho Books' });
  }
});

// Reimbursement approval (accountant only)
router.patch('/:id/reimbursement', authorize('admin', 'accountant', 'developer'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reimbursement_status } = req.body;

  console.log(`[REIMBURSEMENT] Updating expense ${id} to status: "${reimbursement_status}"`);

  // Update reimbursement status using service layer
  const expense = await expenseService.updateReimbursementStatus(
    id,
    reimbursement_status,
    req.user!.role
  );

  console.log(`[REIMBURSEMENT] Successfully updated expense ${id} to status "${reimbursement_status}"`);
  res.json(normalizeExpense(expense));
}));

// Delete expense
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Get expense first to check receipt file
  const expense = await expenseService.getExpenseById(id);

  // Delete expense using service layer (handles authorization)
  await expenseService.deleteExpense(id, req.user!.id, req.user!.role);

  // Delete receipt file if exists
  if (expense.receipt_url) {
    const filePath = path.join(process.cwd(), expense.receipt_url);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted receipt file: ${filePath}`);
      } catch (fileError) {
        console.error(`Failed to delete receipt file: ${filePath}`, fileError);
        // Don't fail the request if file deletion fails
      }
    }
  }

  res.json({ message: 'Expense deleted successfully' });
}));

// ========== ZOHO BOOKS MULTI-ACCOUNT HEALTH CHECK ==========
// GET /zoho/health - Check Zoho Books integration status for all accounts
router.get('/zoho/health', authenticateToken, authorize('admin', 'accountant', 'developer'), async (req: AuthRequest, res) => {
  try {
    const healthStatus = await zohoMultiAccountService.getHealthStatus();
    const statusArray = Array.from(healthStatus.entries()).map(([entity, status]) => ({
      entity,
      ...status,
    }));

    const overallHealthy = statusArray.every(s => s.healthy);
    const realAccounts = statusArray.filter(s => !s.mock).length;
    const mockAccounts = statusArray.filter(s => s.mock).length;

    res.json({
      overall: {
        healthy: overallHealthy,
        totalAccounts: statusArray.length,
        realAccounts,
        mockAccounts,
      },
      accounts: statusArray,
    });
  } catch (error) {
    console.error('[Zoho:MultiAccount] Health check failed:', error);
    res.status(500).json({
      overall: { healthy: false, message: 'Health check failed' },
      error: String(error),
    });
  }
});

// GET /zoho/health/:entity - Check health for specific entity
router.get('/zoho/health/:entity', authenticateToken, authorize('admin', 'accountant', 'developer'), async (req: AuthRequest, res) => {
  try {
    const { entity } = req.params;
    const health = await zohoMultiAccountService.getHealthForEntity(entity);
    res.json(health);
  } catch (error) {
    console.error(`[Zoho:MultiAccount] Health check failed for ${req.params.entity}:`, error);
    res.status(500).json({
      configured: false,
      healthy: false,
      message: 'Health check failed',
      error: String(error),
    });
  }
});

// GET /zoho/accounts - Get available Zoho Books account names for configuration
router.get('/zoho/accounts', authenticateToken, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const accounts = await zohoMultiAccountService.getZohoAccountNames();
    res.json(accounts);
  } catch (error) {
    console.error('[Zoho:MultiAccount] Failed to fetch account names:', error);
    res.status(500).json({
      error: 'Failed to fetch Zoho Books account names',
      message: String(error),
    });
  }
});

// ========== AUDIT TRAIL ==========
// GET /api/expenses/:id/audit - Get audit trail for an expense (accountant/admin/developer only)
router.get('/:id/audit', authorize('admin', 'accountant', 'developer'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Verify expense exists and user has access
  const expense = await expenseService.getExpenseById(id);
  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  // Get audit trail
  const auditTrail = await ExpenseAuditService.getAuditTrail(id);

  res.json({
    expenseId: id,
    auditTrail
  });
}));

export default router;

