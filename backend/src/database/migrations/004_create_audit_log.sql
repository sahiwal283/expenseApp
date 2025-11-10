-- Migration: Create Audit Logs Table
-- Description: Track all user actions, authentication events, and system changes
-- Version: 1.0.0
-- Date: 2025-10-26
-- 
-- NOTE: Table name is 'audit_logs' (plural) to match production database
-- This table was deployed to production before this migration was standardized.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Additional columns for enhanced audit logging
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  changes JSONB,
  error_message TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Foreign key constraint
ALTER TABLE audit_logs 
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add table and column comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log tracking all user actions, auth events, and system changes';
COMMENT ON COLUMN audit_logs.user_name IS 'Cached username at time of action';
COMMENT ON COLUMN audit_logs.user_email IS 'Cached email at time of action';
COMMENT ON COLUMN audit_logs.user_role IS 'User role at time of action';
COMMENT ON COLUMN audit_logs.request_method IS 'HTTP method (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.request_path IS 'API endpoint path';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB of changes made (request body)';
COMMENT ON COLUMN audit_logs.details IS 'Legacy JSONB field for backward compatibility';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if action failed';

