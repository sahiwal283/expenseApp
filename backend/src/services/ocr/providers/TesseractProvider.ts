/**
 * Tesseract OCR Provider
 * 
 * Legacy OCR engine using Tesseract.js
 * Kept for backwards compatibility and as fallback.
 */

import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { OCRProvider, OCRResult } from '../types';

export class TesseractProvider implements OCRProvider {
  name = 'tesseract';
  
  /**
   * Preprocess image for better OCR accuracy
   */
  private async preprocessImage(inputPath: string): Promise<Buffer> {
    try {
      console.log('[Tesseract] Preprocessing image with Sharp...');
      
      const processedImage = await sharp(inputPath)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen text edges
        .median(3) // Reduce noise with median filter
        .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
        .toBuffer();
      
      console.log('[Tesseract] Image preprocessing completed');
      return processedImage;
      
    } catch (error: any) {
      console.error('[Tesseract] Preprocessing error:', error.message);
      // Return original image if preprocessing fails
      return fs.readFileSync(inputPath);
    }
  }
  
  /**
   * Process image with Tesseract OCR
   */
  async process(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    let worker = null;
    
    try {
      console.log('[Tesseract] Starting OCR processing for:', imagePath);
      
      // Preprocess the image
      const preprocessedImage = await this.preprocessImage(imagePath);
      
      // Create Tesseract worker
      worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[Tesseract] Progress: ${(m.progress * 100).toFixed(1)}%`);
          }
        }
      });
      
      // Configure for receipt processing
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/:- '
      });
      
      // Process image
      const { data } = await worker.recognize(preprocessedImage);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[Tesseract] Completed in ${processingTime}ms`);
      console.log(`[Tesseract] Confidence: ${data.confidence.toFixed(2)}%`);
      console.log(`[Tesseract] Text length: ${data.text.length} characters`);
      
      return {
        text: data.text || '',
        confidence: data.confidence / 100 || 0, // Convert to 0-1 range
        provider: this.name,
        processingTime,
        metadata: {
          preprocessed: true,
          language: 'eng'
        }
      };
      
    } catch (error: any) {
      console.error('[Tesseract] Processing error:', error.message);
      
      return {
        text: '',
        confidence: 0,
        provider: this.name,
        processingTime: Date.now() - startTime,
        error: error.message
      };
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }
  
  /**
   * Check if Tesseract is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const worker = await createWorker('eng');
      await worker.terminate();
      return true;
    } catch {
      return false;
    }
  }
}

