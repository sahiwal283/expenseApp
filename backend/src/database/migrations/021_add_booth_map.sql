-- Add booth_map_url column to event_checklists table
ALTER TABLE event_checklists ADD COLUMN IF NOT EXISTS booth_map_url VARCHAR(500);

COMMENT ON COLUMN event_checklists.booth_map_url IS 'URL/path to the uploaded booth floor plan/map image';

