-- Migration: Rename audit_log to audit_logs for consistency
-- Description: Ensures audit_log table is renamed to audit_logs to match code expectations
-- Version: 1.0.0
-- Date: 2025-11-11
-- 
-- NOTE: This migration handles the case where sandbox database has audit_log (singular)
-- but code expects audit_logs (plural). Migration 004 creates audit_logs, but if
-- sandbox was deployed before migration 004 was fixed, it may have audit_log.

-- Check if audit_log (singular) exists and rename it to audit_logs (plural)
DO $$
BEGIN
  -- Check if audit_log (singular) table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log'
  ) THEN
    -- Check if audit_logs (plural) already exists
    IF NOT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    ) THEN
      -- Rename audit_log to audit_logs
      ALTER TABLE audit_log RENAME TO audit_logs;
      
      -- Rename indexes
      IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_audit_log_user_id') THEN
        ALTER INDEX idx_audit_log_user_id RENAME TO idx_audit_logs_user_id;
      END IF;
      
      IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_audit_log_action') THEN
        ALTER INDEX idx_audit_log_action RENAME TO idx_audit_logs_action;
      END IF;
      
      IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_audit_log_created_at') THEN
        ALTER INDEX idx_audit_log_created_at RENAME TO idx_audit_logs_created_at;
      END IF;
      
      IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_audit_log_entity') THEN
        ALTER INDEX idx_audit_log_entity RENAME TO idx_audit_logs_entity;
      END IF;
      
      -- Rename foreign key constraint
      IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_log_user_id_fkey'
      ) THEN
        ALTER TABLE audit_logs 
          RENAME CONSTRAINT audit_log_user_id_fkey TO audit_logs_user_id_fkey;
      END IF;
      
      RAISE NOTICE 'Renamed audit_log table to audit_logs';
    ELSE
      -- Both tables exist - migrate data from audit_log to audit_logs, then drop audit_log
      INSERT INTO audit_logs (
        id, user_id, action, entity_type, entity_id, details, ip_address, 
        user_agent, status, created_at, user_name, user_email, user_role,
        request_method, request_path, changes, error_message
      )
      SELECT 
        id, user_id, action, entity_type, entity_id, details, ip_address,
        user_agent, status, created_at, user_name, user_email, user_role,
        request_method, request_path, changes, error_message
      FROM audit_log
      WHERE id NOT IN (SELECT id FROM audit_logs)
      ON CONFLICT (id) DO NOTHING;
      
      -- Drop old table
      DROP TABLE audit_log CASCADE;
      
      RAISE NOTICE 'Migrated data from audit_log to audit_logs and dropped audit_log';
    END IF;
  ELSE
    -- audit_log doesn't exist, ensure audit_logs exists (migration 004 should have created it)
    IF NOT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    ) THEN
      RAISE NOTICE 'Neither audit_log nor audit_logs exists. Run migration 004_create_audit_log.sql first.';
    ELSE
      RAISE NOTICE 'audit_logs table already exists. No action needed.';
    END IF;
  END IF;
END $$;

-- Ensure all required columns exist (in case migration 004 wasn't fully applied)
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'user_name'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'request_method'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN request_method VARCHAR(10);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'request_path'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN request_path VARCHAR(500);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'changes'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN changes JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Ensure indexes exist (recreate if missing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Add table comment
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log tracking all user actions, auth events, and system changes (renamed from audit_log for consistency)';

