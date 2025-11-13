-- Migration: Allow NULL roles for newly registered users awaiting admin assignment
-- Version: 2.7.0
-- Date: 2025-10-13
-- Note: This migration is superseded by migration 012 which uses 'pending' role instead of NULL

-- Check if constraint already includes 'pending' (migration 012 was applied)
DO $$
BEGIN
    -- If constraint includes 'pending', migration 012 was applied and this is superseded
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND contype = 'c' 
        AND conname = 'users_role_check'
        AND pg_get_constraintdef(oid) LIKE '%pending%'
    ) THEN
        -- Migration 012 already applied, skip this migration's constraint changes
        RAISE NOTICE 'Migration 012 already applied, skipping constraint modification';
    ELSE
        -- Modify the role column to allow NULL values (legacy approach)
        ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
        
        -- Update the CHECK constraint to allow NULL (pending users)
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check 
          CHECK (role IS NULL OR role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer'));
    END IF;
END $$;

-- Add index for finding users with pending role assignment
CREATE INDEX IF NOT EXISTS idx_users_pending_role ON users(role) WHERE role IS NULL;

-- Add a registration_pending flag for better tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;

