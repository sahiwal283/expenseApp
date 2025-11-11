/**
 * Tesseract OCR Utilities
 * Helper functions for OCR processing using Tesseract.js
 */

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import fs from 'fs';

/**
 * Image preprocessing function to improve OCR accuracy
 */
export async function preprocessImage(inputPath: string): Promise<Buffer> {
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

/**
 * Enhanced OCR processing function with image preprocessing
 */
export async function processOCR(filePath: string): Promise<{
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

/**
 * Enhanced structured data extraction from OCR text
 */
export function extractStructuredData(text: string): any {
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

