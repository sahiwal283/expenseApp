-- Migration: Add checklist templates for default tasks
-- Version: 1.18.5
-- Date: 2025-10-28
-- Description: Allow admins to create template tasks that auto-apply to all new events

-- Create checklist templates table (global default tasks)
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_templates_active ON checklist_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_position ON checklist_templates(position);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_updated
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_template_timestamp();

-- Add a flag to track if a checklist has been initialized with templates
ALTER TABLE event_checklists 
ADD COLUMN IF NOT EXISTS templates_applied BOOLEAN DEFAULT FALSE;

-- Insert some default templates (optional - you can customize these)
INSERT INTO checklist_templates (title, description, position, is_active) VALUES
    ('Order promotional materials', 'Brochures, business cards, banners, etc.', 1, true),
    ('Book photographer', 'Professional photos for booth and products', 2, true),
    ('Arrange water/refreshments', 'Water bottles and snacks for booth attendees', 3, true),
    ('Print product catalogs', 'Updated product catalogs for distribution', 4, true),
    ('Confirm booth setup time', 'Verify early access for booth setup', 5, true)
ON CONFLICT DO NOTHING;

