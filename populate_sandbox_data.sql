-- Comprehensive test data for sandbox environment
-- Run this script to populate all necessary data for full workflow testing

-- First, clear existing data (keep schema)
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE event_participants CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE app_settings CASCADE;
TRUNCATE TABLE users CASCADE;

-- Create test users for all roles with password: sandbox123
-- Password hash for 'sandbox123' using bcrypt (cost 10)

INSERT INTO users (id, username, password, name, email, role, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', '$2b$10$Tx.ZwbSUfydWzk8s99GUrea9T0DRx3ABqEOiYDPEXemcd1HBECA..', 'Admin User', 'admin@expenseapp.com', 'admin', NOW()),
('22222222-2222-2222-2222-222222222222', 'coordinator', '$2b$10$Tx.ZwbSUfydWzk8s99GUrea9T0DRx3ABqEOiYDPEXemcd1HBECA..', 'Sarah Johnson', 'sarah@expenseapp.com', 'coordinator', NOW()),
('33333333-3333-3333-3333-333333333333', 'salesperson', '$2b$10$Tx.ZwbSUfydWzk8s99GUrea9T0DRx3ABqEOiYDPEXemcd1HBECA..', 'Mike Chen', 'mike@expenseapp.com', 'salesperson', NOW()),
('44444444-4444-4444-4444-444444444444', 'accountant', '$2b$10$Tx.ZwbSUfydWzk8s99GUrea9T0DRx3ABqEOiYDPEXemcd1HBECA..', 'Lisa Williams', 'lisa@expenseapp.com', 'accountant', NOW()),
('55555555-5555-5555-5555-555555555555', 'salesperson2', '$2b$10$Tx.ZwbSUfydWzk8s99GUrea9T0DRx3ABqEOiYDPEXemcd1HBECA..', 'Tom Rodriguez', 'tom@expenseapp.com', 'salesperson', NOW());

-- Create app settings with card and entity options
INSERT INTO app_settings (key, value, created_at) VALUES
('cardOptions', '["Corporate Amex", "Corporate Visa", "Personal Card (Reimbursement)", "Company Debit Card", "Cash", "Prepaid Travel Card"]', NOW()),
('entityOptions', '["Entity A - Main Operations", "Entity B - Sales Division", "Entity C - Marketing Department", "Entity D - International Operations", "Entity E - Research & Development", "Entity F - Customer Success"]', NOW()),
('maxFileSize', '5242880', NOW()),
('allowedFileTypes', '["image/jpeg", "image/png", "image/jpg", "application/pdf"]', NOW());

-- Create multiple trade show events with different statuses
INSERT INTO events (id, name, venue, city, state, start_date, end_date, budget, status, coordinator_id, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CES 2025', 'Las Vegas Convention Center', 'Las Vegas', 'Nevada', '2025-01-07', '2025-01-10', 75000.00, 'upcoming', '22222222-2222-2222-2222-222222222222', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mobile World Congress 2025', 'Fira Barcelona', 'Barcelona', 'Spain', '2025-02-24', '2025-02-27', 95000.00, 'upcoming', '22222222-2222-2222-2222-222222222222', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Spring Fashion Week', 'Javits Center', 'New York', 'New York', '2024-09-15', '2024-09-20', 125000.00, 'active', '22222222-2222-2222-2222-222222222222', NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Auto Show Chicago', 'McCormick Place', 'Chicago', 'Illinois', '2024-08-10', '2024-08-14', 60000.00, 'completed', '22222222-2222-2222-2222-222222222222', NOW());

-- Add participants to events
INSERT INTO event_participants (event_id, user_id, created_at) VALUES
-- CES 2025
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', NOW()),
-- MWC 2025
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', NOW()),
-- Fashion Week (active)
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', NOW()),
-- Auto Show (completed)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', NOW());

-- Create diverse expenses with different statuses for testing all workflows
INSERT INTO expenses (id, event_id, user_id, category, merchant, amount, date, description, card_used, reimbursement_required, status, zoho_entity, location, submitted_at) VALUES
-- Pending expenses (need approval)
('e0000001-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Meals', 'The Capital Grille', 287.50, '2024-09-16', 'Client dinner - 4 people', 'Corporate Amex', false, 'pending', NULL, 'New York, NY', NOW() - INTERVAL '2 days'),
('e0000002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Transportation', 'Uber', 45.75, '2024-09-17', 'Airport to hotel transfer', 'Personal Card (Reimbursement)', true, 'pending', NULL, 'New York, NY', NOW() - INTERVAL '1 day'),
('e0000003-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Accommodation', 'Marriott Times Square', 1250.00, '2024-09-15', 'Hotel stay - 5 nights', 'Corporate Visa', false, 'pending', NULL, 'New York, NY', NOW() - INTERVAL '3 days'),
('e0000004-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Marketing Materials', 'FedEx Office', 342.80, '2024-09-14', 'Printed brochures and banners', 'Company Debit Card', false, 'pending', NULL, 'New York, NY', NOW() - INTERVAL '4 days'),
('e0000005-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Meals', 'Starbucks', 18.50, '2024-09-18', 'Coffee and breakfast', 'Cash', true, 'pending', NULL, 'New York, NY', NOW()),

-- Approved expenses (some need Zoho entity assignment, some need reimbursement)
('e0000006-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Transportation', 'United Airlines', 456.00, '2024-08-09', 'Flight to Chicago', 'Corporate Amex', false, 'approved', NULL, 'Chicago, IL', NOW() - INTERVAL '20 days'),
('e0000007-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Accommodation', 'Hilton Chicago', 890.00, '2024-08-10', 'Hotel - 4 nights', 'Corporate Visa', false, 'approved', 'Entity B - Sales Division', 'Chicago, IL', NOW() - INTERVAL '19 days'),
('e0000008-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Meals', 'Gibsons Bar & Steakhouse', 198.75, '2024-08-11', 'Dinner with prospects', 'Personal Card (Reimbursement)', true, 'approved', 'Entity B - Sales Division', 'Chicago, IL', NOW() - INTERVAL '18 days'),
('e0000009-0000-0000-0000-000000000009', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Shipping', 'UPS Store', 125.30, '2024-08-13', 'Shipped samples back to office', 'Company Debit Card', false, 'approved', 'Entity A - Main Operations', 'Chicago, IL', NOW() - INTERVAL '16 days'),

-- Approved expenses needing reimbursement approval
('e0000010-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Transportation', 'Yellow Cab', 32.50, '2024-09-16', 'Taxi to venue', 'Personal Card (Reimbursement)', true, 'approved', 'Entity B - Sales Division', 'New York, NY', NOW() - INTERVAL '2 days'),
('e0000011-0000-0000-0000-000000000011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Meals', 'Joes Pizza', 24.75, '2024-09-17', 'Lunch', 'Cash', true, 'approved', 'Entity B - Sales Division', 'New York, NY', NOW() - INTERVAL '1 day'),

-- Some rejected expenses
('e0000012-0000-0000-0000-000000000012', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Entertainment', 'Broadway Theatre', 350.00, '2024-08-12', 'Theatre tickets', 'Personal Card (Reimbursement)', true, 'rejected', NULL, 'Chicago, IL', NOW() - INTERVAL '17 days'),
('e0000013-0000-0000-0000-000000000013', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Other', 'Best Buy', 199.99, '2024-09-15', 'Personal headphones', 'Personal Card (Reimbursement)', true, 'rejected', NULL, 'New York, NY', NOW() - INTERVAL '3 days'),

-- Mix of expenses for testing
('e0000014-0000-0000-0000-000000000014', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Booth Setup', 'Display Designs Inc', 3500.00, '2024-09-14', 'Custom booth design and setup', 'Corporate Amex', false, 'approved', 'Entity C - Marketing Department', 'New York, NY', NOW() - INTERVAL '4 days'),
('e0000015-0000-0000-0000-000000000015', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Marketing Materials', 'Print Shop NYC', 875.25, '2024-09-13', 'Business cards and promotional materials', 'Corporate Visa', false, 'pending', NULL, 'New York, NY', NOW() - INTERVAL '5 days'),
('e0000016-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Booth Setup', 'Las Vegas Event Services', 4200.00, '2024-12-20', 'Pre-paid booth space for CES', 'Corporate Amex', false, 'approved', 'Entity C - Marketing Department', 'Las Vegas, NV', NOW() - INTERVAL '10 days'),
('e0000017-0000-0000-0000-000000000017', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Transportation', 'Delta Airlines', 1245.50, '2024-12-15', 'Flight to Barcelona - MWC', 'Corporate Visa', false, 'approved', 'Entity B - Sales Division', 'Barcelona, Spain', NOW() - INTERVAL '15 days');

-- Update some expenses with reimbursement status
UPDATE expenses SET reimbursement_status = 'approved' WHERE id IN ('e0000008-0000-0000-0000-000000000008');
UPDATE expenses SET reimbursement_status = 'pending' WHERE id IN ('e0000010-0000-0000-0000-000000000010', 'e0000011-0000-0000-0000-000000000011');
UPDATE expenses SET reimbursement_status = 'rejected' WHERE id IN ('e0000012-0000-0000-0000-000000000012', 'e0000013-0000-0000-0000-000000000013');

-- Add comments to reviewed expenses
UPDATE expenses SET comments = 'Approved - standard business dinner expense' WHERE id = 'e0000006-0000-0000-0000-000000000006';
UPDATE expenses SET comments = 'Approved - within policy limits' WHERE id = 'e0000007-0000-0000-0000-000000000007';
UPDATE expenses SET comments = 'Rejected - entertainment expenses require pre-approval' WHERE id = 'e0000012-0000-0000-0000-000000000012';
UPDATE expenses SET comments = 'Rejected - personal items not reimbursable' WHERE id = 'e0000013-0000-0000-0000-000000000013';

-- Summary of test data created
SELECT 
    'USERS CREATED' as summary,
    COUNT(*) as count 
FROM users
UNION ALL
SELECT 
    'EVENTS CREATED' as summary,
    COUNT(*) as count 
FROM events
UNION ALL
SELECT 
    'EXPENSES - PENDING' as summary,
    COUNT(*) as count 
FROM expenses 
WHERE status = 'pending'
UNION ALL
SELECT 
    'EXPENSES - APPROVED' as summary,
    COUNT(*) as count 
FROM expenses 
WHERE status = 'approved'
UNION ALL
SELECT 
    'EXPENSES - REJECTED' as summary,
    COUNT(*) as count 
FROM expenses 
WHERE status = 'rejected'
UNION ALL
SELECT 
    'EXPENSES NEEDING REIMBURSEMENT' as summary,
    COUNT(*) as count 
FROM expenses 
WHERE reimbursement_required = true AND reimbursement_status = 'pending';

-- Print test credentials
SELECT 
    '=== TEST ACCOUNTS ===' as info,
    '' as username,
    '' as password,
    '' as role
UNION ALL
SELECT 
    'Login with any of these:' as info,
    '' as username,
    '' as password,
    '' as role
UNION ALL
SELECT 
    '' as info,
    username,
    'sandbox123' as password,
    role
FROM users
ORDER BY role;

