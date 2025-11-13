-- Migration: Add Event Checklist Tables
-- Description: Creates tables to store trade show checklist data including flights, hotels, rentals, and shipping
-- Version: 1.20.0
-- Date: October 27, 2025

-- Create main checklist table
CREATE TABLE IF NOT EXISTS event_checklists (
    id SERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    booth_ordered BOOLEAN DEFAULT FALSE,
    booth_notes TEXT,
    booth_map_url TEXT,
    electricity_ordered BOOLEAN DEFAULT FALSE,
    electricity_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id)
);

-- Note: templates_applied column is added in migration 019

-- Create flights table (per attendee)
CREATE TABLE IF NOT EXISTS checklist_flights (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES event_checklists(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attendee_name VARCHAR(255) NOT NULL,
    carrier VARCHAR(255),
    confirmation_number VARCHAR(255),
    notes TEXT,
    booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hotels table (per attendee)
CREATE TABLE IF NOT EXISTS checklist_hotels (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES event_checklists(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attendee_name VARCHAR(255) NOT NULL,
    property_name VARCHAR(255),
    confirmation_number VARCHAR(255),
    check_in_date DATE,
    check_out_date DATE,
    notes TEXT,
    booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create car rentals table
CREATE TABLE IF NOT EXISTS checklist_car_rentals (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES event_checklists(id) ON DELETE CASCADE,
    provider VARCHAR(255),
    confirmation_number VARCHAR(255),
    pickup_date DATE,
    return_date DATE,
    notes TEXT,
    booked BOOLEAN DEFAULT FALSE,
    rental_type VARCHAR(50) DEFAULT 'group' CHECK (rental_type IN ('group', 'individual')),
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create booth shipping table
CREATE TABLE IF NOT EXISTS checklist_booth_shipping (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES event_checklists(id) ON DELETE CASCADE,
    shipping_method VARCHAR(50) NOT NULL CHECK (shipping_method IN ('manual', 'carrier')),
    carrier_name VARCHAR(255),
    tracking_number VARCHAR(255),
    shipping_date DATE,
    delivery_date DATE,
    notes TEXT,
    shipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: checklist_custom_items table is created in migration 018
-- Note: checklist_templates table is created in migration 019

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_checklists_event_id ON event_checklists(event_id);
CREATE INDEX IF NOT EXISTS idx_checklist_flights_checklist_id ON checklist_flights(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_hotels_checklist_id ON checklist_hotels(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_car_rentals_checklist_id ON checklist_car_rentals(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_booth_shipping_checklist_id ON checklist_booth_shipping(checklist_id);

-- Add comments
COMMENT ON TABLE event_checklists IS 'Main checklist table for each trade show event';
COMMENT ON TABLE checklist_flights IS 'Flight bookings per attendee for each event';
COMMENT ON TABLE checklist_hotels IS 'Hotel reservations per attendee for each event';
COMMENT ON TABLE checklist_car_rentals IS 'Car rental bookings for each event';
COMMENT ON TABLE checklist_booth_shipping IS 'Booth shipping information for each event';

COMMENT ON COLUMN event_checklists.booth_ordered IS 'Whether the booth space has been ordered';
COMMENT ON COLUMN event_checklists.booth_map_url IS 'URL path to uploaded booth map file';
COMMENT ON COLUMN event_checklists.electricity_ordered IS 'Whether electricity for the booth has been ordered';
COMMENT ON COLUMN checklist_booth_shipping.shipping_method IS 'Either manual delivery or carrier shipping';
COMMENT ON COLUMN checklist_car_rentals.rental_type IS 'Type of rental: group (shared) or individual (assigned to specific person)';

