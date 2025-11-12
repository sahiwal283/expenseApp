/**
 * Upload Configuration
 * Multer configuration for file uploads (receipts, images, booth maps)
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Ensure directory exists with proper permissions (0o755)
 * Creates directory and parent directories if they don't exist
 * Sets permissions to rwxr-xr-x (owner: read/write/execute, group/others: read/execute)
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    // Create directory with recursive option and proper permissions
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
    console.log(`[Upload] Created directory: ${dirPath} with permissions 0o755`);
  } else {
    // Verify directory is writable
    try {
      fs.accessSync(dirPath, fs.constants.W_OK);
    } catch (error) {
      console.warn(`[Upload] Directory exists but is not writable: ${dirPath}`);
      // Try to fix permissions
      try {
        fs.chmodSync(dirPath, 0o755);
        console.log(`[Upload] Fixed permissions for directory: ${dirPath}`);
      } catch (chmodError) {
        console.error(`[Upload] Failed to fix permissions for ${dirPath}:`, chmodError);
      }
    }
  }
}

/**
 * Initialize upload directories on startup
 * Verifies all required upload directories exist and are writable
 */
export function initializeUploadDirectories(): void {
  try {
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const boothMapsDir = path.join(baseUploadDir, 'booth-maps');

    // Ensure base upload directory exists
    ensureDirectory(baseUploadDir);

    // Ensure booth-maps subdirectory exists
    ensureDirectory(boothMapsDir);

    // Verify write permissions
    try {
      const testFile = path.join(boothMapsDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[Upload] ✓ Upload directories verified and writable`);
    } catch (error) {
      console.error(`[Upload] ⚠️ Warning: Upload directories may not be writable:`, error);
    }
  } catch (error) {
    console.error(`[Upload] ⚠️ Failed to initialize upload directories:`, error);
  }
}

// Configure multer storage for receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    ensureDirectory(uploadDir);
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
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const uploadDir = path.join(baseUploadDir, 'booth-maps');
    
    // Ensure parent directory exists first
    ensureDirectory(baseUploadDir);
    // Then ensure booth-maps directory exists
    ensureDirectory(uploadDir);
    
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

