/**
 * Upload Configuration
 * Multer configuration for file uploads (receipts, images, booth maps)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage for receipts
const receiptStorage = multer.diskStorage({
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

// Configure multer storage for booth maps
const boothMapStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/booth-maps';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'booth-map-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer upload middleware for receipts
export const upload = multer({
  storage: receiptStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }, // 10MB default
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

// Configure multer upload middleware for booth maps
export const uploadBoothMap = multer({
  storage: boothMapStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept common image formats and PDFs (including phone camera formats)
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|heic|heif|webp/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    
    // Accept any image MIME type (image/*) or PDF
    // This handles phone cameras which may send image/heic, image/heif, image/x-png, etc.
    const mimetypeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    
    if (extname && mimetypeOk) {
      console.log(`[Upload] Accepting booth map: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    } else {
      console.warn(`[Upload] Rejected booth map: ${file.originalname} (ext: ${path.extname(file.originalname)}, mime: ${file.mimetype})`);
      cb(new Error(`Invalid file type. Only images (JPEG, PNG, GIF, HEIC, WebP) and PDF files are allowed. Received: ${file.mimetype}`));
    }
  }
});

