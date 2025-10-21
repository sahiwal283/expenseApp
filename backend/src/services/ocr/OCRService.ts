/**
 * OCR Service Orchestrator
 * 
 * Main service that coordinates OCR providers, inference engines, and user corrections.
 * Provides high-level API for receipt processing with confidence-based fallbacks.
 */

import { OCRProvider, InferenceEngine, OCRServiceConfig, ProcessedReceipt, FieldInference } from './types';
import { EasyOCRProvider } from './providers/EasyOCRProvider';
import { TesseractProvider } from './providers/TesseractProvider';
import { RuleBasedInferenceEngine } from './inference/RuleBasedInferenceEngine';
import { createLLMProvider } from './inference/LLMProvider';

export class OCRService {
  private config: OCRServiceConfig;
  private primaryProvider: OCRProvider;
  private fallbackProvider?: OCRProvider;
  private inferenceEngine: InferenceEngine;
  private llmProvider: any = null; // LLMProvider when implemented
  
  constructor(config?: Partial<OCRServiceConfig>) {
    // Default configuration
    this.config = {
      primaryProvider: 'easyocr',
      fallbackProvider: undefined, // No fallback needed - EasyOCR is reliable
      inferenceEngine: 'rule-based',
      confidenceThreshold: 0.6,
      enableUserCorrections: true,
      logOCRResults: true,
      ...config
    };
    
    // Initialize providers
    this.primaryProvider = this.createProvider(this.config.primaryProvider);
    if (this.config.fallbackProvider) {
      this.fallbackProvider = this.createProvider(this.config.fallbackProvider);
    }
    
    // Initialize inference engine
    this.inferenceEngine = new RuleBasedInferenceEngine();
    
    console.log('[OCRService] Initialized with config:', {
      primary: this.primaryProvider.name,
      fallback: this.fallbackProvider?.name,
      inference: this.inferenceEngine.name
    });
  }
  
  /**
   * Initialize service (check availability, load LLM if configured)
   */
  async initialize(): Promise<void> {
    console.log('[OCRService] Checking provider availability...');
    
    // Check primary provider
    const primaryAvailable = await this.primaryProvider.isAvailable();
    console.log(`[OCRService] Primary provider (${this.primaryProvider.name}): ${primaryAvailable ? 'available' : 'NOT available'}`);
    
    // If primary not available and fallback exists, swap
    if (!primaryAvailable && this.fallbackProvider) {
      console.log('[OCRService] Primary provider not available, checking fallback...');
      const fallbackAvailable = await this.fallbackProvider.isAvailable();
      
      if (fallbackAvailable) {
        console.log('[OCRService] Swapping to fallback provider');
        [this.primaryProvider, this.fallbackProvider] = [this.fallbackProvider, this.primaryProvider];
      } else {
        console.error('[OCRService] No OCR providers available!');
      }
    }
    
    // Initialize LLM if configured
    if (this.config.llmProvider) {
      console.log(`[OCRService] Initializing LLM provider: ${this.config.llmProvider}`);
      this.llmProvider = await createLLMProvider(this.config.llmProvider);
      
      if (this.llmProvider) {
        console.log(`[OCRService] LLM provider ready: ${this.llmProvider.name}`);
      } else {
        console.warn('[OCRService] LLM provider not available');
      }
    }
  }
  
  /**
   * Process receipt image with OCR and field inference
   * Supports both image files and PDFs
   */
  async processReceipt(filePath: string): Promise<ProcessedReceipt> {
    console.log('[OCRService] Processing receipt:', filePath);
    const startTime = Date.now();
    
    try {
      // Step 1: Determine file type and run appropriate OCR
      const isPDF = filePath.toLowerCase().endsWith('.pdf');
      let ocrResult;
      
      if (isPDF) {
        console.log('[OCRService] Processing PDF receipt');
        // Use EasyOCR's PDF processor
        if (this.primaryProvider instanceof EasyOCRProvider) {
          ocrResult = await this.primaryProvider.processPDF(filePath);
        } else {
          throw new Error('PDF processing requires EasyOCR provider');
        }
      } else {
        console.log('[OCRService] Processing image receipt');
        ocrResult = await this.primaryProvider.process(filePath);
      }
      
      // Step 2: Fallback if confidence is too low (for images only)
      if (!isPDF && ocrResult.confidence < this.config.confidenceThreshold && this.fallbackProvider) {
        console.log(`[OCRService] Primary OCR confidence (${ocrResult.confidence.toFixed(2)}) below threshold, trying fallback...`);
        const fallbackResult = await this.fallbackProvider.process(filePath);
        
        if (fallbackResult.confidence > ocrResult.confidence) {
          console.log(`[OCRService] Using fallback result (confidence: ${fallbackResult.confidence.toFixed(2)})`);
          ocrResult = fallbackResult;
        }
      }
      
      // Step 3: Field inference
      console.log('[OCRService] Running field inference...');
      const inference = await this.inferenceEngine.infer(ocrResult);
      
      // Step 4: Category suggestions
      const categories = await this.inferenceEngine.suggestCategories(ocrResult, inference);
      
      // Step 5: LLM enhancement (if available and needed)
      if (this.llmProvider) {
        const lowConfidenceFields = this.findLowConfidenceFields(inference);
        if (lowConfidenceFields.length > 0) {
          console.log(`[OCRService] Enhancing ${lowConfidenceFields.length} low-confidence fields with LLM: ${lowConfidenceFields.join(', ')}`);
          try {
            const llmEnhancements = await this.llmProvider.extractFields(ocrResult.text, lowConfidenceFields);
            
            // Merge LLM enhancements into inference
            this.mergeLLMEnhancements(inference, llmEnhancements, lowConfidenceFields);
            
            const enhancedCount = Object.keys(llmEnhancements).length;
            console.log(`[OCRService] LLM enhancements applied: ${enhancedCount} field(s) improved`);
          } catch (error: any) {
            console.warn('[OCRService] LLM enhancement failed:', error.message);
            // Continue with rule-based inference even if LLM fails
          }
        } else {
          console.log('[OCRService] All fields have high confidence, skipping LLM');
        }
      }
      
      // Step 6: Calculate overall confidence and review needs
      const { overallConfidence, needsReview, reviewReasons } = this.assessQuality(inference, ocrResult.confidence);
      
      const totalTime = Date.now() - startTime;
      console.log(`[OCRService] Processing complete in ${totalTime}ms (overall confidence: ${overallConfidence.toFixed(2)})`);
      
      // Step 7: Log if configured
      if (this.config.logOCRResults) {
        // TODO: Store in database for analytics
      }
      
      return {
        ocr: ocrResult,
        inference,
        categories,
        overallConfidence,
        needsReview,
        reviewReasons
      };
      
    } catch (error: any) {
      console.error('[OCRService] Processing error:', error.message);
      throw error;
    }
  }
  
  /**
   * Create OCR provider instance
   */
  private createProvider(name: string): OCRProvider {
    switch (name) {
      case 'tesseract':
        return new TesseractProvider();
      case 'easyocr':
        return new EasyOCRProvider({
          languages: ['en'],
          useGPU: false
        });
      default:
        console.warn(`[OCRService] Unknown provider: ${name}, defaulting to Tesseract`);
        return new TesseractProvider();
    }
  }
  
  /**
   * Find fields with low confidence that need LLM assistance
   */
  private findLowConfidenceFields(inference: FieldInference): string[] {
    const threshold = 0.7;
    const lowConfidence: string[] = [];
    
    if (inference.merchant.confidence < threshold) lowConfidence.push('merchant');
    if (inference.amount.confidence < threshold) lowConfidence.push('amount');
    if (inference.date.confidence < threshold) lowConfidence.push('date');
    if (inference.cardLastFour.confidence < threshold) lowConfidence.push('cardLastFour');
    if (inference.category.confidence < threshold) lowConfidence.push('category');
    
    return lowConfidence;
  }
  
  /**
   * Merge LLM enhancements into existing field inference
   * Only replaces fields that have higher confidence from LLM
   */
  private mergeLLMEnhancements(
    inference: FieldInference, 
    llmEnhancements: Partial<FieldInference>,
    requestedFields: string[]
  ): void {
    for (const field of requestedFields) {
      const llmField = (llmEnhancements as any)[field];
      
      if (llmField && llmField.value !== null && llmField.value !== undefined) {
        const existingField = (inference as any)[field];
        
        // Replace if LLM confidence is higher OR if existing field is null
        if (!existingField.value || llmField.confidence > existingField.confidence) {
          console.log(`[OCRService] Replacing ${field}: "${existingField.value}" (${existingField.confidence.toFixed(2)}) → "${llmField.value}" (${llmField.confidence.toFixed(2)})`);
          (inference as any)[field] = {
            ...llmField,
            source: 'llm',
            alternatives: existingField.value ? [existingField] : undefined
          };
        } else {
          console.log(`[OCRService] Keeping rule-based ${field} (higher confidence)`);
        }
      }
    }
  }
  
  /**
   * Assess overall quality and determine if manual review is needed
   */
  private assessQuality(inference: FieldInference, ocrConfidence: number): {
    overallConfidence: number;
    needsReview: boolean;
    reviewReasons?: string[];
  } {
    const fieldConfidences = [
      inference.merchant.confidence,
      inference.amount.confidence,
      inference.date.confidence,
      inference.cardLastFour.confidence || 0,
      inference.category.confidence
    ].filter(c => c > 0); // Only count fields that were found
    
    // Calculate weighted average
    const avgFieldConfidence = fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length;
    const overallConfidence = (avgFieldConfidence * 0.7) + (ocrConfidence * 0.3);
    
    // Determine if review is needed
    const reviewReasons: string[] = [];
    const criticalThreshold = 0.6;
    
    if (ocrConfidence < 0.5) {
      reviewReasons.push('Low OCR quality');
    }
    
    if (!inference.merchant.value || inference.merchant.confidence < criticalThreshold) {
      reviewReasons.push('Merchant unclear');
    }
    
    if (!inference.amount.value || inference.amount.confidence < criticalThreshold) {
      reviewReasons.push('Amount unclear');
    }
    
    if (!inference.date.value || inference.date.confidence < criticalThreshold) {
      reviewReasons.push('Date unclear');
    }
    
    if (!inference.category.value || inference.category.confidence < 0.5) {
      reviewReasons.push('Category uncertain');
    }
    
    const needsReview = reviewReasons.length > 0 || overallConfidence < 0.7;
    
    return {
      overallConfidence,
      needsReview,
      reviewReasons: needsReview ? reviewReasons : undefined
    };
  }
  
  /**
   * Get service configuration
   */
  getConfig(): OCRServiceConfig {
    return { ...this.config };
  }
  
  /**
   * Update service configuration
   */
  updateConfig(config: Partial<OCRServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[OCRService] Configuration updated');
  }
}

// Export singleton instance with Tesseract (CPU-compatible) and Ollama LLM enabled
// NOTE: Using Tesseract for Sandy Bridge CPU compatibility (no AVX2)
// EasyOCR requires PyTorch with AVX2, which isn't available on this hardware
// For newer hardware (Haswell+), switch primaryProvider to 'easyocr' for better accuracy
export const ocrService = new OCRService({
  primaryProvider: 'tesseract',
  fallbackProvider: undefined, // No fallback needed - Tesseract is reliable
  inferenceEngine: 'rule-based',
  llmProvider: 'ollama', // Enable Ollama for low-confidence field enhancement
  confidenceThreshold: 0.6,
  enableUserCorrections: true,
  logOCRResults: true
});

