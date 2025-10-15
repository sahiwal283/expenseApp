-- Create roles table for dynamic role management
-- Migration: 003_create_roles_table.sql
-- Date: 2025-10-15
--
-- This migration creates a dedicated roles table to allow admins to:
-- - View all existing roles
-- - Create custom roles
-- - Manage role properties (name, permissions, etc.)
--
-- System roles (admin, accountant, coordinator, salesperson, developer) 
-- are marked as is_system = true and cannot be deleted

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(50), -- Tailwind classes for UI display
  is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert existing system roles
INSERT INTO roles (name, label, description, color, is_system, is_active) VALUES
  ('admin', 'Administrator', 'Full system access and user management', 'bg-purple-100 text-purple-800', true, true),
  ('accountant', 'Accountant', 'Approve expenses, manage reimbursements, Zoho Books integration', 'bg-orange-100 text-orange-800', true, true),
  ('coordinator', 'Show Coordinator', 'Manage events and participants', 'bg-blue-100 text-blue-800', true, true),
  ('salesperson', 'Sales Person', 'Submit expenses for assigned events', 'bg-emerald-100 text-emerald-800', true, true),
  ('developer', 'Developer', 'Access to dev dashboard and debugging tools', 'bg-indigo-100 text-indigo-800', true, true),
  ('temporary', 'Temporary Attendee', 'Limited event participation for custom attendees', 'bg-gray-100 text-gray-800', true, true),
  ('pending', 'Pending Approval', 'New user awaiting activation', 'bg-yellow-100 text-yellow-800', true, true)
ON CONFLICT (name) DO NOTHING;

-- Drop the old CHECK constraint on users table
-- Note: In PostgreSQL, we need to know the constraint name
-- The constraint is: CHECK (role IN ('admin', 'accountant', 'coordinator', 'salesperson', 'developer', 'pending'))
-- Let's drop it and create a foreign key relationship instead

-- First, find and drop the constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND conname LIKE '%role%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- Note: We keep role as VARCHAR for now (not FK) to avoid breaking existing data
-- In a future migration, we could add a proper FK relationship

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_roles_updated_at();

