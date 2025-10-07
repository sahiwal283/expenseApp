import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// OCR Service Configuration (use 127.0.0.1 instead of localhost to force IPv4)
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000';

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

// OCR processing function using PaddleOCR service
async function processOCR(filePath: string): Promise<{
  text: string;
  confidence: number;
  structured: any;
}> {
  try {
    console.log('Starting PaddleOCR processing for:', filePath);
    
    // Create form data for OCR service
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Call OCR service
    const response = await axios.post(`${OCR_SERVICE_URL}/ocr/process`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000 // 30 second timeout
    });
    
    const result = response.data;
    
    console.log(`PaddleOCR completed: ${result.line_count} lines detected`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    console.log('Extracted structured data:', result.structured);
    
    return {
      text: result.text || '',
      confidence: result.confidence || 0,
      structured: result.structured || {}
    };
    
  } catch (error: any) {
    console.error('PaddleOCR processing error:', error.message);
    if (error.response) {
      console.error('OCR service response:', error.response.data);
    }
    return {
      text: '',
      confidence: 0,
      structured: {}
    };
  }
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

