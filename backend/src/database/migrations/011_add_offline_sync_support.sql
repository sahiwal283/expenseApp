-- Migration: Add Offline Sync Support
-- Version: 1.0.9
-- Date: October 14, 2025
-- Description: Adds sync metadata columns and idempotency table for offline-first sync

-- Add sync metadata columns to expenses table
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add sync metadata columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add sync metadata columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Create idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Create index for entity lookup
CREATE INDEX IF NOT EXISTS idx_idempotency_entity ON idempotency_keys(entity_type, entity_id);

-- Add comments for documentation
COMMENT ON COLUMN expenses.version IS 'Version number for conflict resolution';
COMMENT ON COLUMN expenses.device_id IS 'Device that last modified this record';
COMMENT ON COLUMN expenses.last_sync_at IS 'Last time this record was synced';

COMMENT ON TABLE idempotency_keys IS 'Prevents duplicate submissions from offline sync';
COMMENT ON COLUMN idempotency_keys.key IS 'UUID idempotency key from client';
COMMENT ON COLUMN idempotency_keys.entity_type IS 'Type of entity (expense, event, user)';
COMMENT ON COLUMN idempotency_keys.entity_id IS 'ID of the created/updated entity';
COMMENT ON COLUMN idempotency_keys.expires_at IS 'When this key expires (7 days)';

-- Optional: Create cleanup function for expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create periodic cleanup (uncomment if you want automatic cleanup)
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('cleanup-idempotency-keys', '0 2 * * *', 'SELECT cleanup_expired_idempotency_keys()');

COMMIT;

