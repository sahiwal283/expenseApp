-- Migration: Fix Audit Log Table Name
-- Description: Rename audit_log (singular) to audit_logs (plural) to match code expectations
-- Version: 1.28.0
-- Date: November 10, 2025
-- 
-- Issue: Sandbox database has audit_log (singular) but code expects audit_logs (plural)
-- Resolution: Rename table and update all indexes/constraints to match migration 004
-- 
-- This migration is idempotent - safe to run multiple times

-- Step 1: Check if audit_logs already exists (from migration 004)
DO $$
BEGIN
  -- If audit_logs already exists, skip the rename
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    RAISE NOTICE 'Table audit_logs already exists, skipping rename';
  -- If audit_log exists but audit_logs doesn't, rename it
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    -- Rename the table
    ALTER TABLE audit_log RENAME TO audit_logs;
    RAISE NOTICE 'Renamed audit_log to audit_logs';
    
    -- Rename indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_log_pkey') THEN
      ALTER INDEX audit_log_pkey RENAME TO audit_logs_pkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_action') THEN
      ALTER INDEX idx_audit_log_action RENAME TO idx_audit_logs_action;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_user_id') THEN
      ALTER INDEX idx_audit_log_user_id RENAME TO idx_audit_logs_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_created_at') THEN
      ALTER INDEX idx_audit_log_created_at RENAME TO idx_audit_logs_created_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_entity_type') THEN
      ALTER INDEX idx_audit_log_entity_type RENAME TO idx_audit_logs_entity;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_user_action') THEN
      ALTER INDEX idx_audit_log_user_action RENAME TO idx_audit_logs_user_action;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_status') THEN
      ALTER INDEX idx_audit_log_status RENAME TO idx_audit_logs_status;
    END IF;
    
    -- Rename foreign key constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_user_id_fkey') THEN
      ALTER TABLE audit_logs RENAME CONSTRAINT audit_log_user_id_fkey TO audit_logs_user_id_fkey;
    END IF;
    
    -- Rename check constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_status_check') THEN
      ALTER TABLE audit_logs RENAME CONSTRAINT audit_log_status_check TO audit_logs_status_check;
    END IF;
  END IF;
END $$;

-- Step 2: Ensure all columns from migration 004 exist
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS details JSONB;

-- Step 3: Update column types to match migration 004 (if needed)
-- Note: These ALTER COLUMN statements will only run if types differ
DO $$
BEGIN
  -- Update entity_type from VARCHAR(100) to VARCHAR(50) if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'entity_type' 
    AND character_maximum_length > 50
  ) THEN
    ALTER TABLE audit_logs ALTER COLUMN entity_type TYPE VARCHAR(50);
  END IF;
  
  -- Update status from VARCHAR(50) to VARCHAR(20) if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'status' 
    AND character_maximum_length > 20
  ) THEN
    ALTER TABLE audit_logs ALTER COLUMN status TYPE VARCHAR(20);
  END IF;
  
  -- Update ip_address from VARCHAR(45) to INET if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'ip_address' 
    AND data_type = 'character varying'
  ) THEN
    -- Convert VARCHAR IP addresses to INET
    -- Note: This will fail if any invalid IPs exist, so we use a safe approach
    BEGIN
      ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE INET USING ip_address::INET;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not convert ip_address to INET, keeping VARCHAR type';
    END;
  END IF;
END $$;

-- Step 4: Ensure CHECK constraint on status matches migration 004
DO $$
BEGIN
  -- Drop old constraint if it exists with different values
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_status_check') THEN
    ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_status_check;
  END IF;
  
  -- Add correct CHECK constraint
  ALTER TABLE audit_logs 
    ADD CONSTRAINT audit_logs_status_check 
    CHECK (status IN ('success', 'failure', 'warning'));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Status check constraint already exists';
END $$;

-- Step 5: Ensure all indexes from migration 004 exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Step 6: Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_logs_user_id_fkey'
  ) THEN
    ALTER TABLE audit_logs 
      ADD CONSTRAINT audit_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 7: Add table and column comments (matching migration 004)
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log tracking all user actions, auth events, and system changes';
COMMENT ON COLUMN audit_logs.user_name IS 'Cached username at time of action';
COMMENT ON COLUMN audit_logs.user_email IS 'Cached email at time of action';
COMMENT ON COLUMN audit_logs.user_role IS 'User role at time of action';
COMMENT ON COLUMN audit_logs.request_method IS 'HTTP method (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.request_path IS 'API endpoint path';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB of changes made (request body)';
COMMENT ON COLUMN audit_logs.details IS 'Legacy JSONB field for backward compatibility';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if action failed';


