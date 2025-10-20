/**
 * PaddleOCR Provider
 * 
 * High-accuracy OCR engine using PaddleOCR (Python).
 * Calls Python script via child_process for OCR processing.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { OCRProvider, OCRResult } from '../types';

export class PaddleOCRProvider implements OCRProvider {
  name = 'paddleocr';
  private pythonPath: string;
  private scriptPath: string;
  
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    // In production, __dirname points to dist/, but Python script is in src/
    // Use environment variable or fall back to relative path from project root
    const projectRoot = process.env.PROJECT_ROOT || path.join(__dirname, '../../../..');
    this.scriptPath = path.join(projectRoot, 'src/services/ocr/paddleocr_processor.py');
  }
  
  /**
   * Process image with PaddleOCR
   */
  async process(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('[PaddleOCR] Starting OCR processing for:', imagePath);
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      // Check if Python script exists
      if (!fs.existsSync(this.scriptPath)) {
        throw new Error(`PaddleOCR Python script not found: ${this.scriptPath}`);
      }
      
      // Call Python script
      const result = await this.callPythonScript(imagePath);
      
      const processingTime = Date.now() - startTime;
      
      if (result.error) {
        console.error('[PaddleOCR] Error:', result.error);
        return {
          text: '',
          confidence: 0,
          provider: this.name,
          processingTime,
          metadata: {
            error: result.error,
            available: result.available || false
          }
        };
      }
      
      console.log(`[PaddleOCR] Completed in ${processingTime}ms`);
      console.log(`[PaddleOCR] Confidence: ${(result.confidence * 100).toFixed(2)}%`);
      console.log(`[PaddleOCR] Words detected: ${result.wordCount || 0}`);
      
      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        provider: this.name,
        processingTime,
        metadata: {
          wordCount: result.wordCount,
          preprocessed: true,
          available: true
        }
      };
      
    } catch (error: any) {
      console.error('[PaddleOCR] Processing error:', error.message);
      
      return {
        text: '',
        confidence: 0,
        provider: this.name,
        processingTime: Date.now() - startTime,
        metadata: {
          error: error.message,
          available: false
        }
      };
    }
  }
  
  /**
   * Call Python script to process image
   */
  private async callPythonScript(imagePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      const python = spawn(this.pythonPath, [this.scriptPath, imagePath]);
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('[PaddleOCR] Python script error:', stderr);
          reject(new Error(stderr || `Python process exited with code ${code}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error: any) {
          console.error('[PaddleOCR] Failed to parse Python output:', stdout);
          reject(new Error(`Failed to parse OCR result: ${error.message}`));
        }
      });
      
      python.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
      
      // Timeout after 45 seconds (first run may be slow due to model loading)
      setTimeout(() => {
        python.kill();
        reject(new Error('PaddleOCR processing timeout (45s)'));
      }, 45000);
    });
  }
  
  /**
   * Check if PaddleOCR is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Python script exists
      if (!fs.existsSync(this.scriptPath)) {
        console.warn('[PaddleOCR] Python script not found');
        return false;
      }
      
      // Try to run Python and check if PaddleOCR is installed
      const result = await new Promise<boolean>((resolve) => {
        const python = spawn(this.pythonPath, ['-c', 'import paddleocr; print("ok")']);
        
        let success = false;
        python.stdout.on('data', (data) => {
          if (data.toString().trim() === 'ok') {
            success = true;
          }
        });
        
        python.on('close', () => {
          resolve(success);
        });
        
        python.on('error', () => {
          resolve(false);
        });
        
        setTimeout(() => {
          python.kill();
          resolve(false);
        }, 15000); // Increased from 5s to 15s - PaddleOCR takes ~8s to import models
      });
      
      if (result) {
        console.log('[PaddleOCR] Available and ready');
      } else {
        console.warn('[PaddleOCR] Not available - PaddleOCR Python package not installed');
      }
      
      return result;
      
    } catch (error: any) {
      console.error('[PaddleOCR] Availability check error:', error.message);
      return false;
    }
  }
}

