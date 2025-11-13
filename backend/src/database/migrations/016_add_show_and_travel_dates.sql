-- Migration: Add separate show dates and travel dates to events
-- Created: 2025-10-27
-- Description: Adds show_start_date, show_end_date, travel_start_date, travel_end_date columns

-- Add new date columns (initially nullable for backward compatibility)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS show_start_date DATE,
ADD COLUMN IF NOT EXISTS show_end_date DATE,
ADD COLUMN IF NOT EXISTS travel_start_date DATE,
ADD COLUMN IF NOT EXISTS travel_end_date DATE;

-- Copy existing dates to show dates (for existing events)
UPDATE events 
SET show_start_date = start_date,
    show_end_date = end_date
WHERE show_start_date IS NULL;

-- Set travel dates to match show dates for existing events (reasonable default)
UPDATE events 
SET travel_start_date = start_date,
    travel_end_date = end_date
WHERE travel_start_date IS NULL;

-- Now make the new columns NOT NULL
ALTER TABLE events 
ALTER COLUMN show_start_date SET NOT NULL,
ALTER COLUMN show_end_date SET NOT NULL,
ALTER COLUMN travel_start_date SET NOT NULL,
ALTER COLUMN travel_end_date SET NOT NULL;

-- Add check constraints to ensure date logic
ALTER TABLE events 
ADD CONSTRAINT check_show_dates CHECK (show_end_date >= show_start_date),
ADD CONSTRAINT check_travel_dates CHECK (travel_end_date >= travel_start_date);

-- Add comment for documentation
COMMENT ON COLUMN events.show_start_date IS 'Start date of the actual event/show';
COMMENT ON COLUMN events.show_end_date IS 'End date of the actual event/show';
COMMENT ON COLUMN events.travel_start_date IS 'Start date for travel (may be before show)';
COMMENT ON COLUMN events.travel_end_date IS 'End date for travel (may be after show)';

-- Note: Keeping start_date and end_date for backward compatibility
-- They can be deprecated in a future migration
COMMENT ON COLUMN events.start_date IS 'DEPRECATED: Use show_start_date instead';
COMMENT ON COLUMN events.end_date IS 'DEPRECATED: Use show_end_date instead';

