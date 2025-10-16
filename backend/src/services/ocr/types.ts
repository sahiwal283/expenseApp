/**
 * OCR Service Types & Interfaces
 * 
 * Defines the contract for OCR providers and field inference engines.
 * This modular architecture allows easy swapping of OCR engines (Tesseract, PaddleOCR, etc.)
 * and inference strategies (rule-based, LLM-based, hybrid).
 */

export interface OCRResult {
  text: string;
  confidence: number;
  provider: string;
  processingTime: number;
  metadata?: {
    imageSize?: { width: number; height: number };
    preprocessed?: boolean;
    language?: string;
  };
}

export interface FieldInference {
  merchant: FieldValue<string>;
  amount: FieldValue<number>;
  date: FieldValue<string>;
  cardLastFour: FieldValue<string>;
  category: FieldValue<string>;
  location?: FieldValue<string>;
  taxAmount?: FieldValue<number>;
  tipAmount?: FieldValue<number>;
}

export interface FieldValue<T> {
  value: T | null;
  confidence: number; // 0-1 scale
  source: 'ocr' | 'inference' | 'llm' | 'user';
  rawText?: string; // Original OCR text that led to this value
  alternatives?: Array<{ value: T; confidence: number }>; // Alternative interpretations
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  keywords: string[]; // Keywords that matched
  source: 'rule-based' | 'llm' | 'user-history';
}

export interface UserCorrection {
  id?: string;
  expenseId?: string;
  userId: string;
  timestamp: Date;
  originalOCRText: string;
  originalInference: FieldInference;
  correctedFields: Partial<{
    merchant: string;
    amount: number;
    date: string;
    cardLastFour: string;
    category: string;
  }>;
  receiptImagePath?: string;
  notes?: string;
}

export interface OCRProvider {
  name: string;
  process(imagePath: string): Promise<OCRResult>;
  isAvailable(): Promise<boolean>;
}

export interface InferenceEngine {
  name: string;
  infer(ocrResult: OCRResult): Promise<FieldInference>;
  suggestCategories(ocrResult: OCRResult, inference: FieldInference): Promise<CategorySuggestion[]>;
}

/**
 * LLM Provider Interface (Future Implementation)
 * 
 * This interface defines the contract for LLM-based field extraction
 * and validation. Currently not implemented, but framework is ready.
 */
export interface LLMProvider {
  name: string;
  extractFields(ocrText: string, lowConfidenceFields: string[]): Promise<Partial<FieldInference>>;
  validateFields(inference: FieldInference): Promise<{ valid: boolean; corrections?: Partial<FieldInference> }>;
  isAvailable(): Promise<boolean>;
}

export interface OCRServiceConfig {
  primaryProvider: 'tesseract' | 'paddleocr';
  fallbackProvider?: 'tesseract' | 'paddleocr';
  inferenceEngine: 'rule-based' | 'llm' | 'hybrid';
  llmProvider?: 'openai' | 'claude' | 'local';
  confidenceThreshold: number; // Minimum confidence to accept OCR result
  enableUserCorrections: boolean;
  logOCRResults: boolean;
}

export interface ProcessedReceipt {
  ocr: OCRResult;
  inference: FieldInference;
  categories: CategorySuggestion[];
  overallConfidence: number;
  needsReview: boolean; // True if any field has low confidence
  reviewReasons?: string[]; // Why review is needed
}

