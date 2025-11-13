-- Add fields to support individual vs group car rentals and participant assignment
ALTER TABLE checklist_car_rentals ADD COLUMN IF NOT EXISTS rental_type VARCHAR(20) DEFAULT 'group';
ALTER TABLE checklist_car_rentals ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE checklist_car_rentals ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);

COMMENT ON COLUMN checklist_car_rentals.rental_type IS 'Type of rental: individual or group';
COMMENT ON COLUMN checklist_car_rentals.assigned_to_id IS 'User ID if this is an individual rental';
COMMENT ON COLUMN checklist_car_rentals.assigned_to_name IS 'User name if this is an individual rental';

-- Add index for assigned_to_id
CREATE INDEX IF NOT EXISTS idx_car_rentals_assigned_to ON checklist_car_rentals (assigned_to_id);

