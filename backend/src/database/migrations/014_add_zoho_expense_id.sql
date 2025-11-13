-- Migration: Add zoho_expense_id column to expenses table
-- Date: 2025-10-08
-- Purpose: Store Zoho Books expense ID for tracking submitted expenses

-- Add zoho_expense_id column
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS zoho_expense_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_zoho_expense_id 
ON expenses(zoho_expense_id);

-- Add comment for documentation
COMMENT ON COLUMN expenses.zoho_expense_id IS 'Zoho Books expense ID (for tracking synced expenses)';

