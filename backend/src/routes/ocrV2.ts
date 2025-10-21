/**
 * Enhanced OCR API Routes (v2)
 * 
 * New OCR endpoints with field inference, confidence scores, and user corrections.
 * Backward compatible - legacy /ocr endpoint remains unchanged.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../utils/errors';
import { ocrService } from '../services/ocr/OCRService';
import { userCorrectionService } from '../services/ocr/UserCorrectionService';
import { FieldWarningService } from '../services/ocr/FieldWarningService';

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
 * POST /api/ocr/v2/process
 * 
 * Enhanced OCR processing with field inference and confidence scores
 */
router.post('/process', upload.single('receipt'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  console.log(`[OCR v2] Processing receipt: ${req.file.filename}`);

  try {
    // Initialize OCR service (checks provider availability)
    await ocrService.initialize();
    
    // Process receipt with enhanced OCR
    const result = await ocrService.processReceipt(req.file.path);
    
    // Analyze fields for potential issues
    const fieldWarnings = FieldWarningService.analyzeFields(result.inference, result.ocr.text);
    
    // Prepare response
    const response = {
      success: true,
      
      // OCR results
      ocr: {
        text: result.ocr.text,
        confidence: result.ocr.confidence,
        provider: result.ocr.provider,
        processingTime: result.ocr.processingTime
      },
      
      // Inferred fields with confidence scores
      fields: {
        merchant: {
          value: result.inference.merchant.value,
          confidence: result.inference.merchant.confidence,
          source: result.inference.merchant.source
        },
        amount: {
          value: result.inference.amount.value,
          confidence: result.inference.amount.confidence,
          source: result.inference.amount.source,
          alternatives: result.inference.amount.alternatives
        },
        date: {
          value: result.inference.date.value,
          confidence: result.inference.date.confidence,
          source: result.inference.date.source
        },
        cardLastFour: {
          value: result.inference.cardLastFour.value,
          confidence: result.inference.cardLastFour.confidence,
          source: result.inference.cardLastFour.source
        },
        category: {
          value: result.inference.category.value,
          confidence: result.inference.category.confidence,
          source: result.inference.category.source
        },
        location: result.inference.location?.value ? {
          value: result.inference.location.value,
          confidence: result.inference.location.confidence
        } : null,
        taxAmount: result.inference.taxAmount?.value ? {
          value: result.inference.taxAmount.value,
          confidence: result.inference.taxAmount.confidence
        } : null,
        tipAmount: result.inference.tipAmount?.value ? {
          value: result.inference.tipAmount.value,
          confidence: result.inference.tipAmount.confidence
        } : null
      },
      
      // Category suggestions (top 3)
      categories: result.categories,
      
      // Quality assessment
      quality: {
        overallConfidence: result.overallConfidence,
        needsReview: result.needsReview,
        reviewReasons: result.reviewReasons
      },
      
      // Field warnings (NEW)
      warnings: fieldWarnings,
      
      // Receipt URL
      receiptUrl: `/uploads/${req.file.filename}`
    };
    
    console.log(`[OCR v2] Success - Overall confidence: ${result.overallConfidence.toFixed(2)}`);
    console.log(`[OCR v2] Needs review: ${result.needsReview}${result.reviewReasons ? ` (${result.reviewReasons.join(', ')})` : ''}`);
    if (fieldWarnings.length > 0) {
      console.log(`[OCR v2] Field warnings: ${fieldWarnings.map(w => `${w.field} (${w.severity}): ${w.reason}`).join('; ')}`);
    }
    
    res.json(response);
    
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
  
  const config = ocrService.getConfig();
  
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

