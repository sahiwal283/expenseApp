/**
 * Tesseract OCR Provider
 * 
 * Optimized native Tesseract OCR engine with advanced preprocessing.
 * Uses Python subprocess with OpenCV for maximum accuracy on receipts.
 * 
 * Features:
 * - Advanced image preprocessing (DPI normalization, denoise, deskew, adaptive threshold)
 * - Custom PSM modes optimized for receipts
 * - Per-line confidence scores
 * - Hardware compatible (AVX-only, no AVX2 required)
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { OCRProvider, OCRResult } from '../types';

export class TesseractProvider implements OCRProvider {
  readonly name = 'tesseract';
  
  private pythonPath: string;
  private scriptPath: string;
  private languages: string[];
  private psmMode: number;
  private tryAllPsmModes: boolean;
  
  constructor(options: {
    pythonPath?: string;
    languages?: string[];
    psmMode?: number;
    tryAllPsmModes?: boolean;
  } = {}) {
    this.pythonPath = options.pythonPath || 'python3';
    this.languages = options.languages || ['eng'];
    this.psmMode = options.psmMode || 6; // PSM 6: Uniform block of text (best for receipts)
    this.tryAllPsmModes = options.tryAllPsmModes !== undefined ? options.tryAllPsmModes : true;
    
    // Path to Python processor script
    this.scriptPath = path.join(__dirname, '..', 'tesseract_processor.py');
    
    console.log('[Tesseract] Provider initialized', {
      pythonPath: this.pythonPath,
      languages: this.languages,
      psmMode: this.psmMode,
      tryAllPsmModes: this.tryAllPsmModes,
      scriptPath: this.scriptPath
    });
  }
  
  /**
   * Check if Tesseract is available on the system
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Python is available
      await this.executePython(['-c', 'import sys; print(sys.version)']);
      
      // Check if required Python packages are installed
      await this.executePython(['-c', 'import cv2, pytesseract; print("OK")']);
      
      // Check if script exists
      await fs.access(this.scriptPath);
      
      // Check if tesseract binary is available
      await this.executePython(['-c', 'import pytesseract; pytesseract.get_tesseract_version()']);
      
      console.log('[Tesseract] Provider is available');
      return true;
    } catch (error) {
      console.error('[Tesseract] Provider not available:', error);
      return false;
    }
  }
  
  /**
   * Process image with Tesseract OCR
   */
  async process(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('[Tesseract] Processing image:', imagePath);
      
      // Validate image exists
      await fs.access(imagePath);
      
      // Build command arguments
      const args = [
        this.scriptPath,
        imagePath,
        '--lang', this.languages.join(','),
        '--psm', this.psmMode.toString(),
        '--target-dpi', '300'
      ];
      
      if (this.tryAllPsmModes) {
        args.push('--try-all-psm');
      }
      
      // Execute Python script
      const output = await this.executePython(args);
      
      // Parse JSON response
      const result = JSON.parse(output);
      
      // Handle error response
      if (!result.success) {
        throw new Error(result.error || 'Tesseract processing failed');
      }
      
      const processingTime = Date.now() - startTime;
      
      // Map to OCRResult interface
      const ocrResult: OCRResult = {
        text: result.text || '',
        confidence: result.confidence || 0.0,
        provider: this.name,
        processingTime,
        metadata: {
          lineCount: result.line_count,
          lines: result.lines || [],
          preprocessed: true,
          language: result.metadata?.language,
          psmMode: result.metadata?.psm_mode,
          wordCount: result.metadata?.word_count,
          skewAngle: result.metadata?.skew_angle,
          stepsApplied: result.metadata?.steps_applied
        }
      };
      
      console.log('[Tesseract] Processing complete:', {
        textLength: ocrResult.text.length,
        confidence: `${(ocrResult.confidence * 100).toFixed(1)}%`,
        processingTime: `${processingTime}ms`,
        lineCount: result.line_count,
        psmMode: result.metadata?.psm_mode
      });
      
      return ocrResult;
      
    } catch (error) {
      console.error('[Tesseract] Processing error:', error);
      
      return {
        text: '',
        confidence: 0,
        provider: this.name,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Execute Python command and capture output
   */
  private executePython(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, args);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
      
      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }
}

