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
  // Clean the text
  const cleanText = text.trim();
  
  // Extract merchant (usually first line)
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
  const merchant = lines[0]?.trim() || 'Unknown Merchant';
  
  // Extract total amount with multiple patterns
  let amount = null;
  const amountPatterns = [
    /(?:total|amount|sum|balance)[:\s]*\$?\s*(\d+[.,]\d{2})/i,
    /\$\s*(\d+[.,]\d{2})(?:\s|$)/,
    /(?:^|\s)(\d+[.,]\d{2})\s*(?:total|usd|$)/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  // Extract date with multiple formats
  let date = null;
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/i
  ];
  
  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      date = match[0];
      break;
    }
  }
  
  // Extract location/address
  let location = null;
  const locationPattern = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way)[\w\s,]*)/i;
  const locationMatch = cleanText.match(locationPattern);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }
  
  // Try to categorize based on merchant name
  let category = 'Other';
  const merchantLower = merchant.toLowerCase();
  if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
    category = 'Meals';
  } else if (merchantLower.includes('hotel') || merchantLower.includes('inn')) {
    category = 'Lodging';
  } else if (merchantLower.includes('gas') || merchantLower.includes('fuel')) {
    category = 'Transportation';
  } else if (merchantLower.includes('uber') || merchantLower.includes('lyft') || merchantLower.includes('taxi')) {
    category = 'Transportation';
  } else if (merchantLower.includes('office') || merchantLower.includes('supplies')) {
    category = 'Office Supplies';
  }
  
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
    res.json(result.rows);
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create expense with optional receipt upload and OCR
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

    res.json(result.rows[0]);
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

    res.json(result.rows[0]);
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

    res.json(result.rows[0]);
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

    res.json(result.rows[0]);
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
