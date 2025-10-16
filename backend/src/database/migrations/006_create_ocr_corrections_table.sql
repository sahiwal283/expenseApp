-- Migration: Create OCR Corrections Table
-- Purpose: Store user corrections to OCR inferences for continuous learning
-- Date: 2025-10-16

CREATE TABLE IF NOT EXISTS ocr_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Original OCR data
  ocr_provider VARCHAR(50) NOT NULL, -- 'tesseract', 'paddleocr', etc.
  ocr_text TEXT NOT NULL,
  ocr_confidence DECIMAL(3,2) NOT NULL CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
  
  -- Original inferred fields (JSON for flexibility)
  original_inference JSONB NOT NULL,
  
  -- User-corrected fields
  corrected_merchant VARCHAR(255),
  corrected_amount DECIMAL(12,2),
  corrected_date VARCHAR(50),
  corrected_card_last_four VARCHAR(4),
  corrected_category VARCHAR(100),
  
  -- Metadata
  receipt_image_path VARCHAR(500),
  correction_notes TEXT,
  
  -- Fields that were corrected (for analytics)
  fields_corrected TEXT[], -- Array of field names that were changed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for queries
  CONSTRAINT ocr_corrections_check_at_least_one_correction
    CHECK (
      corrected_merchant IS NOT NULL OR
      corrected_amount IS NOT NULL OR
      corrected_date IS NOT NULL OR
      corrected_card_last_four IS NOT NULL OR
      corrected_category IS NOT NULL
    )
);

-- Indexes for performance
CREATE INDEX idx_ocr_corrections_user_id ON ocr_corrections(user_id);
CREATE INDEX idx_ocr_corrections_expense_id ON ocr_corrections(expense_id);
CREATE INDEX idx_ocr_corrections_created_at ON ocr_corrections(created_at DESC);
CREATE INDEX idx_ocr_corrections_fields_corrected ON ocr_corrections USING GIN(fields_corrected);

-- Add comment
COMMENT ON TABLE ocr_corrections IS 'Stores user corrections to OCR inferences for ML training and accuracy improvement';
COMMENT ON COLUMN ocr_corrections.original_inference IS 'Complete FieldInference object as JSON for reference';
COMMENT ON COLUMN ocr_corrections.fields_corrected IS 'Array of field names that user corrected (e.g., [merchant, amount])';

-- Sample data for testing
-- INSERT INTO ocr_corrections (user_id, ocr_provider, ocr_text, ocr_confidence, original_inference, corrected_merchant, corrected_amount, fields_corrected)
-- VALUES (
--   (SELECT id FROM users WHERE username = 'developer' LIMIT 1),
--   'paddleocr',
--   'WALMART\nTotal: $45.99\n10/15/2025',
--   0.85,
--   '{"merchant": {"value": "WALMAR", "confidence": 0.75}, "amount": {"value": 45.99, "confidence": 0.90}}'::jsonb,
--   'Walmart',
--   45.99,
--   ARRAY['merchant']
-- );

