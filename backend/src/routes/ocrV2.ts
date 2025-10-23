/**
 * Enhanced OCR API Routes (v2)
 * 
 * New OCR endpoints with field inference, confidence scores, and user corrections.
 * Backward compatible - legacy /ocr endpoint remains unchanged.
 * 
 * INTEGRATION: External OCR Service at http://192.168.1.195:8000
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { userCorrectionService } from '../services/ocr/UserCorrectionService';
import { FieldWarningService } from '../services/ocr/FieldWarningService';

// External OCR Service configuration
const EXTERNAL_OCR_URL = process.env.OCR_SERVICE_URL || 'http://192.168.1.195:8000';
const OCR_TIMEOUT = parseInt(process.env.OCR_TIMEOUT || '120000'); // 2 minutes

const router = Router();

// Configure multer (same as legacy endpoint)
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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|pdf|heic|heif|webp/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    
    // Accept any image MIME type (image/*) or PDF
    const mimetypeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    
    if (extname && mimetypeOk) {
      console.log(`[OCR v2 Upload] Accepting file: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    } else {
      console.warn(`[OCR v2 Upload] Rejected file: ${file.originalname} (ext: ${path.extname(file.originalname)}, mime: ${file.mimetype})`);
      cb(new Error('Only images (JPEG, PNG, HEIC, WebP) and PDF files are allowed'));
    }
  }
});

router.use(authenticateToken);

/**
 * Check if external OCR service is available
 */
async function checkOCRServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${EXTERNAL_OCR_URL}/health/ready`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('[OCR Health] External OCR service not available:', (error as any).message);
    return false;
  }
}

/**
 * Call external OCR service
 */
async function callExternalOCR(filePath: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post(
    `${EXTERNAL_OCR_URL}/ocr/`,
    formData,
    {
      headers: formData.getHeaders(),
      timeout: OCR_TIMEOUT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  );
  
  return response.data;
}

/**
 * POST /api/ocr/v2/process
 * 
 * Enhanced OCR processing with field inference and confidence scores
 * Routes to external OCR service with fallback to embedded OCR
 */
router.post('/process', upload.single('receipt'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  console.log(`[OCR v2] Processing receipt: ${req.file.filename}`);

  try {
    // Check if external OCR service is available
    const isHealthy = await checkOCRServiceHealth();
    
    if (!isHealthy) {
      throw new Error('OCR service is currently unavailable. Please try again later.');
    }
    
    console.log('[OCR v2] Using external OCR service');
    
    // Call external OCR service
    const result = await callExternalOCR(req.file.path);
    
    // Analyze fields for potential issues
    let fieldWarnings: any[] = [];
    if (result.fields) {
      // Convert external response to internal format for field warnings
      const inference = {
        merchant: result.fields.merchant || { value: null, confidence: 0, source: 'inference' },
        amount: result.fields.amount || { value: null, confidence: 0, source: 'inference' },
        date: result.fields.date || { value: null, confidence: 0, source: 'inference' },
        category: result.fields.category || { value: null, confidence: 0, source: 'inference' },
        cardLastFour: result.fields.cardLastFour || { value: null, confidence: 0, source: 'inference' },
        location: result.fields.location || null,
        taxAmount: result.fields.taxAmount || null,
        tipAmount: result.fields.tipAmount || null
      };
      
      fieldWarnings = FieldWarningService.analyzeFields(inference, result.ocr?.text || '');
    }
    
    // Add warnings to response
    result.warnings = fieldWarnings;
    
    console.log(`[OCR v2] External OCR success - Overall confidence: ${result.quality?.overallConfidence?.toFixed(2) || 'N/A'}`);
    
    // Return external service response directly (already in correct format)
    res.json(result);
    
  } catch (error: any) {
    console.error('[OCR v2] Processing error:', error.message);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    throw error;
  }
}));

/**
 * POST /api/ocr/v2/corrections
 * 
 * Submit user corrections for OCR results
 */
router.post('/corrections', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ValidationError('User ID required');
  }
  
  const {
    expenseId,
    originalOCRText,
    originalInference,
    correctedFields,
    receiptImagePath,
    notes
  } = req.body;
  
  // Validate required fields
  if (!originalOCRText || !originalInference || !correctedFields) {
    throw new ValidationError('Missing required fields: originalOCRText, originalInference, correctedFields');
  }
  
  // Check that at least one field was corrected
  const hasCorrectedField = Object.values(correctedFields).some(v => v !== undefined && v !== null);
  if (!hasCorrectedField) {
    throw new ValidationError('At least one corrected field must be provided');
  }
  
  console.log(`[OCR v2] Storing user correction from user ${userId}`);
  
  // Store correction
  const correctionId = await userCorrectionService.storeCorrection({
    expenseId,
    userId,
    originalOCRText,
    originalInference,
    correctedFields,
    receiptImagePath,
    notes,
    timestamp: new Date()
  });
  
  res.json({
    success: true,
    correctionId,
    message: 'Correction stored successfully'
  });
}));

/**
 * GET /api/ocr/v2/corrections/stats
 * 
 * Get correction statistics (admin/developer only)
 */
router.get('/corrections/stats', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  const stats = await userCorrectionService.getCorrectionStats();
  
  res.json({
    success: true,
    stats
  });
}));

/**
 * GET /api/ocr/v2/corrections/export
 * 
 * Export corrections for ML training (admin/developer only)
 */
router.get('/corrections/export', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  const { startDate, endDate } = req.query;
  
  const corrections = await userCorrectionService.exportCorrectionsForTraining(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );
  
  res.json({
    success: true,
    count: corrections.length,
    corrections
  });
}));

/**
 * GET /api/ocr/v2/config
 * 
 * Get current OCR service configuration (developer only)
 */
router.get('/config', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  
  const config = {
    type: 'external',
    ocrServiceUrl: EXTERNAL_OCR_URL,
    timeout: OCR_TIMEOUT,
    dataPoolUrl: process.env.DATA_POOL_URL || 'http://192.168.1.196:5000',
    dataPoolEnabled: process.env.SEND_TO_DATA_POOL !== 'false'
  };
  
  res.json({
    success: true,
    config
  });
}));

/**
 * GET /api/ocr/v2/accuracy
 * 
 * Get historical accuracy metrics for OCR fields (admin/developer only)
 */
router.get('/accuracy', asyncHandler(async (req: AuthRequest, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'developer') {
    return res.status(403).json({ error: 'Admin or developer access required' });
  }
  
  const { field, days } = req.query;
  const daysBack = parseInt(days as string || '30');
  
  // If specific field requested
  if (field) {
    const db = req.app.get('db');
    const accuracy = await FieldWarningService.getHistoricalAccuracy(db, field as string, daysBack);
    return res.json({
      success: true,
      field,
      daysBack,
      ...accuracy
    });
  }
  
  // Otherwise, get accuracy for all fields
  const db = req.app.get('db');
  const fields = ['merchant', 'amount', 'date', 'category', 'cardLastFour'];
  const accuracyData = await Promise.all(
    fields.map(async (f) => ({
      field: f,
      ...(await FieldWarningService.getHistoricalAccuracy(db, f, daysBack))
    }))
  );
  
  res.json({
    success: true,
    daysBack,
    fields: accuracyData
  });
}));

export default router;

