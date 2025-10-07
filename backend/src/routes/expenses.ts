import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
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

// Image preprocessing for better OCR accuracy
async function preprocessImage(filePath: string): Promise<Buffer> {
  try {
    return await sharp(filePath)
      .grayscale()           // Convert to grayscale
      .normalize()           // Normalize contrast
      .sharpen()             // Sharpen edges
      .threshold(128)        // Binary threshold for clarity
      .toBuffer();
  } catch (error) {
    console.error('Image preprocessing error:', error);
    // Return original if preprocessing fails
    return await sharp(filePath).toBuffer();
  }
}

// Extract structured data from OCR text
function extractReceiptData(text: string) {
  console.log("\n=== OCR EXTRACTION START ===");
  console.log("Raw OCR text (first 300 chars):", text.substring(0, 300));
  
  // Clean the text
  const cleanText = text.trim();
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
  
  // Extract merchant (usually first line or line with business-like name)
  let merchant = 'Unknown Merchant';
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    // Skip lines with only numbers, dates, or very short text
    if (trimmed.length > 3 && !/^\d+[\/\-]/.test(trimmed) && !/^\$?\d+\.\d{2}$/.test(trimmed)) {
      merchant = trimmed;
      break;
    }
  }
  console.log("Extracted Merchant:", merchant);
  
  // Extract total amount with multiple patterns
  let amount = null;
  const amountPatterns = [
    /(?:total|amount|sum|balance|subtotal)[:\s]*\$?\s*(\d+[.,]\d{2})/i,
    /\$\s*(\d+[.,]\d{2})(?:\s|$)/,
    /(?:^|\s)(\d+[.,]\d{2})\s*(?:total|usd|$)/i,
    /(\d+[.,]\d{2})/  // Fallback: any number with 2 decimals
  ];
  
  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const parsed = parseFloat(match[1].replace(',', '.'));
      if (parsed > 0 && parsed < 100000) {  // Reasonable amount
        amount = parsed;
        break;
      }
    }
  }
  console.log("Extracted Amount:", amount);
  
  // Extract date with MANY more patterns
  let date = null;
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,  // MM/DD/YYYY
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,    // YYYY-MM-DD
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/i,  // Month DD, YYYY
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,  // DD Month YYYY
    /(?:date|time)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,  // Date: or Time: prefix
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2})\s+\d{1,2}:\d{2}/  // Date with time
  ];
  
  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      console.log("Date pattern matched:", match[0]);
      try {
        const parsedDate = new Date(match[1] || match[0]);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');
          date = `${year}-${month}-${day}`;
          console.log("Normalized date:", date);
          break;
        }
      } catch (e) {
        console.log("Failed to parse date, trying next pattern");
      }
    }
  }
  
  // If no date found, use today as fallback
  if (!date) {
    const today = new Date();
    date = today.toISOString().split('T')[0];
    console.log("No date found in receipt, using today:", date);
  }
  
  // Extract location/address
  let location = null;
  const locationPattern = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way)[\w\s,]*)/i;
  const locationMatch = cleanText.match(locationPattern);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }
  console.log("Extracted Location:", location);
  
  // Try to categorize based on merchant name
  let category = 'Other';
  const textLower = (merchant + ' ' + cleanText).toLowerCase();
  if (/restaurant|cafe|coffee|pizza|burger|food|grill|diner/.test(textLower)) {
    category = 'Meals';
  } else if (/hotel|inn|lodge|resort|motel/.test(textLower)) {
    category = 'Lodging';
  } else if (/gas|fuel|shell|chevron|exxon|mobil|bp/.test(textLower)) {
    category = 'Transportation';
  } else if (/uber|lyft|taxi|cab|airline|flight|airport/.test(textLower)) {
    category = 'Transportation';
  } else if (/office|supplies|staples|depot|fedex|ups|print/.test(textLower)) {
    category = 'Supplies';
  } else if (/market|grocery|store|walmart|target/.test(textLower)) {
    category = 'Supplies';
  }
  console.log("Extracted Category:", category);
  console.log("=== END EXTRACTION ===\n");
  
  return {
    merchant,
    amount,
    date,
    location,
    category
  };
}

// Enhanced OCR processing with preprocessing and structured extraction
async function processOCR(filePath: string): Promise<{
  text: string;
  confidence: number;
  structured: any;
}> {
  try {
    console.log('Starting OCR processing for:', filePath);
    
    // Preprocess image
    const processedImage = await preprocessImage(filePath);
    
    // Create Tesseract worker with optimized settings
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Configure for receipt-like text
    await worker.setParameters({
      tessedit_pageseg_mode: '6',  // Assume uniform block of text
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,:/\\-#@ '
    });
    
    // Recognize text
    const { data } = await worker.recognize(processedImage);
    await worker.terminate();
    
    console.log(`OCR completed with ${Math.round(data.confidence)}% confidence`);
    
    // Extract structured data
    const structured = extractReceiptData(data.text);
    console.log('Extracted structured data:', structured);
    
    return {
      text: data.text,
      confidence: data.confidence / 100,
      structured: structured
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      text: '',
      confidence: 0,
      structured: null
    };
  }
}


// Convert PostgreSQL numeric types to JavaScript numbers
function convertExpenseTypes(expense: any) {
  return {
    ...expense,
    amount: expense.amount ? parseFloat(expense.amount) : 0,
    receiptUrl: expense.receipt_url,
    cardUsed: expense.card_used,
    reimbursementRequired: expense.reimbursement_required,
    reimbursementStatus: expense.reimbursement_status,
    ocrText: expense.ocr_text,
    zohoEntity: expense.zoho_entity,
    tradeShowId: expense.event_id,
    userId: expense.user_id,
  };
}
router.use(authenticateToken);

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
    res.json(result.rows.map(convertExpenseTypes));
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

    res.json(convertExpenseTypes(result.rows[0]));
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create expense with optional receipt upload and OCR
router.post('/', upload.single('receipt'), async (req: AuthRequest, res) => {
  console.log('[DEBUG] POST /api/expenses - File uploaded:', req.file ? req.file.filename : 'NO FILE');
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

    // Process uploaded receipt
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
      
      // Perform OCR on the receipt
      const ocrResult = await processOCR(req.file.path);
      ocrText = ocrResult.text;
      
      // Log OCR results
      console.log(`OCR Confidence: ${Math.round(ocrResult.confidence * 100)}%`);
      if (ocrResult.structured) {
        console.log('Auto-extracted:', ocrResult.structured);
      }
    }

    const result = await query(
      `INSERT INTO expenses (
        event_id, user_id, category, merchant, amount, date, description, 
        card_used, reimbursement_required, receipt_url, ocr_text, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
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
        location
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
router.put('/:id', upload.single('receipt'), async (req: AuthRequest, res) => {
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

    let receiptUrl = null;
    
    // Process uploaded receipt if provided
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    }

    // Build dynamic query based on whether receipt is uploaded
    let updateQuery: string;
    let queryParams: any[];
    
    if (receiptUrl) {
      updateQuery = `UPDATE expenses 
       SET category = $1, merchant = $2, amount = $3, date = $4, description = $5,
           card_used = $6, reimbursement_required = $7, location = $8, zoho_entity = $9,
           receipt_url = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`;
      queryParams = [category, merchant, amount, date, description, card_used, reimbursement_required, location, zoho_entity, receiptUrl, id, req.user?.id];
    } else {
      updateQuery = `UPDATE expenses 
       SET category = $1, merchant = $2, amount = $3, date = $4, description = $5,
           card_used = $6, reimbursement_required = $7, location = $8, zoho_entity = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`;
      queryParams = [category, merchant, amount, date, description, card_used, reimbursement_required, location, zoho_entity, id, req.user?.id];
    }

    const result = await query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    res.json(convertExpenseTypes(result.rows[0]));
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

    res.json(convertExpenseTypes(result.rows[0]));
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

    res.json(convertExpenseTypes(result.rows[0]));
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

    res.json(convertExpenseTypes(result.rows[0]));
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

// OCR-only endpoint for receipt scanning
router.post('/ocr', upload.single('receipt'), async (req: AuthRequest, res) => {
  console.log('[DEBUG] POST /api/expenses - File uploaded:', req.file ? req.file.filename : 'NO FILE');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing OCR for file:', req.file.filename);

    // Perform OCR on the receipt
    const ocrResult = await processOCR(req.file.path);
    
    console.log('OCR Result - Confidence:', Math.round(ocrResult.confidence * 100), '%');
    console.log('Extracted data:', ocrResult.structured);

    // Return OCR results
    res.json({
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      ...ocrResult.structured
    });
  } catch (error) {
    console.error('OCR endpoint error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

export default router;
