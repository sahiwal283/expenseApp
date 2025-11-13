-- Migration 007: Enhance OCR Corrections for Cross-Environment Learning
-- Date: October 16, 2025
-- Purpose: Add environment tagging, versioning, and training readiness flags

-- Add environment tracking
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production'));

-- Add model/prompt versioning
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS llm_model_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS llm_prompt_version VARCHAR(50);

-- Add training dataset flags
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS used_in_training BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS training_dataset_id UUID,
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS anonymized BOOLEAN DEFAULT FALSE;

-- Add correction effectiveness tracking
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS correction_confidence_before DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS correction_confidence_after DECIMAL(3,2);

-- Add metadata for sync and ETL
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS synced_to_training BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sync_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source_expense_environment VARCHAR(20);

-- Indexes for cross-environment queries
CREATE INDEX IF NOT EXISTS idx_ocr_corrections_environment 
ON ocr_corrections(environment);

CREATE INDEX IF NOT EXISTS idx_ocr_corrections_training_ready 
ON ocr_corrections(used_in_training, environment) 
WHERE used_in_training = FALSE;

CREATE INDEX IF NOT EXISTS idx_ocr_corrections_sync_status 
ON ocr_corrections(synced_to_training, created_at);

CREATE INDEX IF NOT EXISTS idx_ocr_corrections_quality 
ON ocr_corrections(data_quality_score DESC) 
WHERE data_quality_score IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN ocr_corrections.environment IS 'Environment where correction was made (sandbox/production)';
COMMENT ON COLUMN ocr_corrections.llm_model_version IS 'LLM model version at time of inference';
COMMENT ON COLUMN ocr_corrections.used_in_training IS 'Whether this correction has been used in retraining';
COMMENT ON COLUMN ocr_corrections.data_quality_score IS 'Quality score 0-1 for training dataset inclusion';
COMMENT ON COLUMN ocr_corrections.anonymized IS 'Whether PII has been removed for training';

-- Create view for training-ready corrections
CREATE OR REPLACE VIEW ocr_training_ready_corrections AS
SELECT 
    oc.*,
    u.name as user_name,
    u.email as user_email
FROM ocr_corrections oc
LEFT JOIN users u ON oc.user_id = u.id
WHERE 
    oc.used_in_training = FALSE
    AND oc.fields_corrected IS NOT NULL
    AND array_length(oc.fields_corrected, 1) > 0
    AND oc.created_at >= NOW() - INTERVAL '90 days'  -- Only recent corrections
ORDER BY oc.created_at DESC;

-- Create view for correction statistics by environment
CREATE OR REPLACE VIEW ocr_correction_stats_by_env AS
SELECT 
    environment,
    COUNT(*) as total_corrections,
    COUNT(DISTINCT user_id) as unique_users,
    array_agg(DISTINCT field) FILTER (WHERE field IS NOT NULL) as all_corrected_fields,
    AVG(ocr_confidence) as avg_original_confidence,
    COUNT(*) FILTER (WHERE used_in_training = TRUE) as used_in_training_count,
    DATE_TRUNC('day', MIN(created_at)) as first_correction_date,
    DATE_TRUNC('day', MAX(created_at)) as last_correction_date
FROM ocr_corrections,
LATERAL unnest(fields_corrected) as field
GROUP BY environment;

-- Grant permissions (adjust as needed)
-- Note: expense_sandbox role may not exist in all environments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_sandbox') THEN
        GRANT SELECT ON ocr_training_ready_corrections TO expense_sandbox;
        GRANT SELECT ON ocr_correction_stats_by_env TO expense_sandbox;
    END IF;
END $$;

