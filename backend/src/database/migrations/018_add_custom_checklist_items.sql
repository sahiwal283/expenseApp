-- Migration: Add custom checklist items table
-- Version: 1.18.4
-- Date: 2025-10-28
-- Description: Allow coordinators to add custom checklist items per event

-- Create custom checklist items table
CREATE TABLE IF NOT EXISTS checklist_custom_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES event_checklists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_items_checklist_id ON checklist_custom_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_custom_items_position ON checklist_custom_items(checklist_id, position);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_item_updated
    BEFORE UPDATE ON checklist_custom_items
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_item_timestamp();

