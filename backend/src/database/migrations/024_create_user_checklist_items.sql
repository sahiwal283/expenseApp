-- Migration: Create User Checklist Items Table
-- Description: User-facing checklist items (guidelines, packing lists) per user per event
-- Version: 1.28.0
-- Date: November 11, 2025
-- 
-- This table stores user-specific checklist items that users can mark as completed.
-- Items are created on-demand when a user first accesses their checklist for an event.
-- Default items: 'guidelines' and 'packing_list' (both initially marked as "coming soon")

-- Create user checklist items table
CREATE TABLE IF NOT EXISTS user_checklist_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('guidelines', 'packing_list') OR item_type LIKE 'custom_%'),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one item per user per event per type
    UNIQUE(user_id, event_id, item_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_user_event ON user_checklist_items(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_event_id ON user_checklist_items(event_id);
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_user_id ON user_checklist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checklist_items_completed ON user_checklist_items(completed);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_checklist_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    -- Auto-set completed_at when completed changes from false to true
    IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    ELSIF NEW.completed = FALSE THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_checklist_item_updated
    BEFORE UPDATE ON user_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_user_checklist_item_timestamp();

-- Add table and column comments
COMMENT ON TABLE user_checklist_items IS 'User-facing checklist items that users can mark as completed per event';
COMMENT ON COLUMN user_checklist_items.user_id IS 'User who owns this checklist item';
COMMENT ON COLUMN user_checklist_items.event_id IS 'Event this checklist item belongs to';
COMMENT ON COLUMN user_checklist_items.item_type IS 'Type of checklist item: guidelines, packing_list, or custom_* for future extensibility';
COMMENT ON COLUMN user_checklist_items.completed IS 'Whether the user has marked this item as completed';
COMMENT ON COLUMN user_checklist_items.completed_at IS 'Timestamp when the item was marked as completed (auto-set by trigger)';
COMMENT ON COLUMN user_checklist_items.created_at IS 'When this checklist item was created';
COMMENT ON COLUMN user_checklist_items.updated_at IS 'Last update timestamp (auto-updated by trigger)';

