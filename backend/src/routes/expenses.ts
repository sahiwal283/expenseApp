import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

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
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }, // 5MB default
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) and PDF files are allowed'));
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
const normalizeExpense = (expense: any) => ({
  ...expense,
  amount: expense.amount ? parseFloat(expense.amount) : null,
});

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
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { event_id, user_id, status } = req.query;
    
    let queryText = `
      SELECT e.*, 
             u.name as user_name, 
             ev.name as event_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN events ev ON e.event_id = ev.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 1;

    if (event_id) {
      queryText += ` AND e.event_id = $${paramCount}`;
      queryParams.push(event_id);
      paramCount++;
    }

    if (user_id) {
      queryText += ` AND e.user_id = $${paramCount}`;
      queryParams.push(user_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND e.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    queryText += ' ORDER BY e.submitted_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows.map(normalizeExpense));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expense by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT e.*, 
              u.name as user_name, 
              ev.name as event_name
       FROM expenses e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN events ev ON e.event_id = ev.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create expense with optional receipt upload and PaddleOCR
router.post('/', upload.single('receipt'), async (req: AuthRequest, res) => {
  try {
    const {
      event_id,
      category,
      merchant,
      amount,
      date,
      description,
      card_used,
      reimbursement_required,
      location
    } = req.body;

    if (!event_id || !category || !merchant || !amount || !date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    let receiptUrl = null;
    let ocrText = null;
    let ocrConfidence = null;
    let extractedData = null;

    // Process uploaded receipt with PaddleOCR
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
      
      // Perform OCR using PaddleOCR service
      const ocrResult = await processOCR(req.file.path);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
      extractedData = ocrResult.structured;
      
      console.log(`Receipt OCR completed with ${(ocrConfidence * 100).toFixed(2)}% confidence`);
    }

    const result = await query(
      `INSERT INTO expenses (
        event_id, user_id, category, merchant, amount, date, description, 
        card_used, reimbursement_required, receipt_url, ocr_text, location, extracted_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [
        event_id,
        req.user?.id,
        category,
        merchant,
        amount,
        date,
        description,
        card_used,
        reimbursement_required === 'true' || reimbursement_required === true,
        receiptUrl,
        ocrText,
        location,
        extractedData ? JSON.stringify(extractedData) : null
      ]
    );

    res.status(201).json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
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

    const result = await query(
      `UPDATE expenses 
       SET category = $1, merchant = $2, amount = $3, date = $4, description = $5,
           card_used = $6, reimbursement_required = $7, location = $8, zoho_entity = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [category, merchant, amount, date, description, card_used, reimbursement_required, location, zoho_entity, id, req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject expense (accountant/admin only)
router.patch('/:id/review', authorize('admin', 'accountant'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE expenses 
       SET status = $1, comments = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, comments, req.user?.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error reviewing expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign Zoho entity (accountant only)
router.patch('/:id/entity', authorize('admin', 'accountant'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { zoho_entity } = req.body;

    const result = await query(
      `UPDATE expenses 
       SET zoho_entity = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [zoho_entity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error assigning entity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reimbursement approval (accountant only)
router.patch('/:id/reimbursement', authorize('admin', 'accountant'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reimbursement_status } = req.body;

    if (!['approved', 'rejected'].includes(reimbursement_status)) {
      return res.status(400).json({ error: 'Invalid reimbursement status' });
    }

    const result = await query(
      `UPDATE expenses 
       SET reimbursement_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reimbursement_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Allow admins to delete any expense, users can only delete their own
    let queryText = 'DELETE FROM expenses WHERE id = $1';
    const queryParams = [id];

    if (req.user?.role !== 'admin') {
      queryText += ' AND user_id = $2';
      queryParams.push(req.user?.id as string);
    }

    queryText += ' RETURNING receipt_url';

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    // Delete receipt file if exists
    if (result.rows[0].receipt_url) {
      const filePath = path.join(process.cwd(), result.rows[0].receipt_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

