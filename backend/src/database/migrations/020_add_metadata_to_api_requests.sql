-- Migration: Add metadata column to api_requests
-- Description: Store additional request metadata like OCR provider used
-- Created: 2025-10-28

-- Add metadata column to store JSON data
ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_requests_metadata ON api_requests USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN api_requests.metadata IS 'Additional metadata about the request (e.g., OCR provider, request details)';

