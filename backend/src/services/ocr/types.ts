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
  error?: string; // Top-level error for failed OCR attempts
  metadata?: {
    imageSize?: { width: number; height: number };
    preprocessed?: boolean;
    language?: string;
    wordCount?: number;
    lineCount?: number; // EasyOCR/Tesseract: number of text lines detected
    detectionCount?: number; // EasyOCR: number of text regions detected
    available?: boolean;
    lines?: Array<{ text: string; confidence: number }>; // EasyOCR/Tesseract: per-line results
    pageCount?: number; // PDF: number of pages processed
    pages?: Array<{ page: number; text: string; confidence: number }>; // PDF: per-page results
    dpi?: number; // PDF: DPI used for conversion
    languages?: string[]; // OCR: languages used
    // Tesseract-specific metadata
    psmMode?: number; // Tesseract: Page segmentation mode used
    skewAngle?: number; // Tesseract: Skew angle detected and corrected (degrees)
    stepsApplied?: string[]; // Tesseract: Preprocessing steps applied
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
  primaryProvider: 'tesseract' | 'paddleocr' | 'easyocr';
  fallbackProvider?: 'tesseract' | 'paddleocr' | 'easyocr';
  inferenceEngine: 'rule-based' | 'llm' | 'hybrid';
  llmProvider?: 'openai' | 'claude' | 'local' | 'ollama';
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

