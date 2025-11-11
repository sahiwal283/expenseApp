/**
 * Upload Configuration
 * Multer configuration for file uploads (receipts, images)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
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

// Configure multer upload middleware
export const upload = multer({
  storage,
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

