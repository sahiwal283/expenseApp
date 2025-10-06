-- Sandbox Test Data Population Script
-- Version: 0.9.0
-- Date: October 6, 2025
-- Purpose: Comprehensive test data for all workflows

-- Clean existing data (in correct order to respect foreign keys)
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE app_settings CASCADE;

-- ===== USERS =====
-- Password for all users: sandbox123 (bcrypt hash)
-- Hash: $2b$10$rZ0qZ4JZoJXYxQj7h6nqWOx0xqxvKQU.JZqZqZqZqZqZqZqZqZqZq

INSERT INTO users (id, username, password, name, email, role, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', '$2b$10$YQ3b4Y2ZJhOcXVNZVNNNYOuGjMbQ8JQwZQjZQzZQzZQzZQzZQzZQy', 'Admin User', 'admin@example.com', 'admin', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'coordinator', '$2b$10$YQ3b4Y2ZJhOcXVNZVNNNYOuGjMbQ8JQwZQjZQzZQzZQzZQzZQzZQy', 'Sarah Coordinator', 'coordinator@example.com', 'coordinator', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'salesperson', '$2b$10$YQ3b4Y2ZJhOcXVNZVNNNYOuGjMbQ8JQwZQjZQzZQzZQzZQzZQzZQy', 'John Salesperson', 'salesperson@example.com', 'salesperson', NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'accountant', '$2b$10$YQ3b4Y2ZJhOcXVNZVNNNYOuGjMbQ8JQwZQjZQzZQzZQzZQzZQzZQy', 'Lisa Accountant', 'accountant@example.com', 'accountant', NOW()),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'salesperson2', '$2b$10$YQ3b4Y2ZJhOcXVNZVNNNYOuGjMbQ8JQwZQjZQzZQzZQzZQzZQzZQy', 'Mike Sales', 'mike@example.com', 'salesperson', NOW());

-- ===== EVENTS =====
INSERT INTO events (id, name, location, start_date, end_date, budget, status, description, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'CES 2025', 'Las Vegas, NV', '2025-01-07', '2025-01-10', 75000.00, 'upcoming', 'Consumer Electronics Show - Major tech trade show', NOW()),
('22222222-2222-2222-2222-222222222222', 'MWC Barcelona 2025', 'Barcelona, Spain', '2025-02-26', '2025-03-01', 90000.00, 'upcoming', 'Mobile World Congress - Global mobile event', NOW()),
('33333333-3333-3333-3333-333333333333', 'NAB Show 2025', 'Las Vegas, NV', '2025-04-12', '2025-04-16', 60000.00, 'active', 'Broadcasting and media technology show', NOW()),
('44444444-4444-4444-4444-444444444444', 'GITEX Dubai 2024', 'Dubai, UAE', '2024-10-14', '2024-10-18', 80000.00, 'completed', 'Gulf Information Technology Exhibition', NOW()),
('55555555-5555-5555-5555-555555555555', 'Web Summit 2024', 'Lisbon, Portugal', '2024-11-11', '2024-11-14', 55000.00, 'completed', 'Tech conference with global reach', NOW());

-- ===== EXPENSES =====
-- Pending expenses (for approval workflow testing)
INSERT INTO expenses (id, event_id, user_id, category, merchant, amount, date, description, card_used, reimbursement_required, status, reimbursement_status, location, created_at) VALUES
('e1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Flights', 'Delta Airlines', 850.00, '2025-04-10', 'Round trip flight to Las Vegas', 'Haute Inc USD Amex', false, 'pending', 'pending', 'Las Vegas, NV', NOW()),
('e2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Hotels', 'Bellagio Hotel', 450.00, '2025-04-11', 'Hotel accommodation for 3 nights', 'Haute Inc USD Amex', false, 'pending', 'pending', 'Las Vegas, NV', NOW()),
('e3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Meals', 'Restaurant at Bellagio', 125.50, '2025-04-12', 'Team dinner', 'Haute Inc USD Amex', false, 'pending', 'pending', 'Las Vegas, NV', NOW()),
('e4444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Transportation', 'Uber', 45.00, '2025-04-12', 'Airport transfer', 'Cash', true, 'pending', 'pending', 'Las Vegas, NV', NOW());

-- Approved expenses (for entity assignment testing)
INSERT INTO expenses (id, event_id, user_id, category, merchant, amount, date, description, card_used, reimbursement_required, status, reimbursement_status, reviewed_by, reviewed_at, location, created_at) VALUES
('e5555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Flights', 'Emirates Airlines', 1250.00, '2024-10-13', 'Round trip to Dubai', 'Haute Inc USD Amex', false, 'approved', 'approved', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '5 days', 'Dubai, UAE', NOW() - INTERVAL '6 days'),
('e6666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Hotels', 'Atlantis The Palm', 600.00, '2024-10-14', 'Hotel for 4 nights', 'Haute Inc USD Amex', false, 'approved', 'approved', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '4 days', 'Dubai, UAE', NOW() - INTERVAL '5 days'),
('e7777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Marketing Materials', 'Local Print Shop', 350.00, '2024-10-15', 'Brochures and business cards', 'Haute Inc USD Amex', false, 'approved', 'approved', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '3 days', 'Dubai, UAE', NOW() - INTERVAL '4 days'),
('e8888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Meals', 'Pierchic Restaurant', 180.00, '2024-10-16', 'Client dinner', 'Haute Inc USD Amex', false, 'approved', 'approved', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '2 days', 'Dubai, UAE', NOW() - INTERVAL '3 days');

-- Approved with entity (for reports testing)
INSERT INTO expenses (id, event_id, user_id, category, merchant, amount, date, description, card_used, reimbursement_required, status, reimbursement_status, zoho_entity, reviewed_by, reviewed_at, location, created_at) VALUES
('e9999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Flights', 'TAP Air Portugal', 750.00, '2024-11-10', 'Round trip to Lisbon', 'Haute Inc USD Amex', false, 'approved', 'approved', 'Haute Inc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '10 days', 'Lisbon, Portugal', NOW() - INTERVAL '11 days'),
('ea111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Hotels', 'Four Seasons Lisbon', 500.00, '2024-11-11', 'Hotel for 3 nights', 'Haute Inc USD Amex', false, 'approved', 'approved', 'Haute Inc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '9 days', 'Lisbon, Portugal', NOW() - INTERVAL '10 days'),
('ea222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Supplies', 'Office Supply Store', 120.00, '2024-11-12', 'Booth supplies and materials', 'Haute LLC USD Amex', false, 'approved', 'approved', 'Haute LLC', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '8 days', 'Lisbon, Portugal', NOW() - INTERVAL '9 days');

-- Rejected expenses (for comprehensive testing)
INSERT INTO expenses (id, event_id, user_id, category, merchant, amount, date, description, card_used, reimbursement_required, status, reimbursement_status, reviewed_by, reviewed_at, review_comments, location, created_at) VALUES
('ea333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Entertainment', 'Casino', 500.00, '2024-10-16', 'Entertainment expenses', 'Cash', true, 'rejected', 'rejected', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '2 days', 'Not a valid business expense', 'Dubai, UAE', NOW() - INTERVAL '3 days');

-- ===== APP SETTINGS =====
INSERT INTO app_settings (key, value) VALUES
('cardOptions', '["Haute Intl GBP Amex", "Haute Intl USD Amex", "Haute Intl USD Debit", "Haute Inc GBP Amex", "Haute Inc USD Amex", "Haute Inc USD Debit", "Haute LLC GBP Amex", "Haute LLC USD Amex", "Haute LLC USD Debit", "Cash"]'),
('entityOptions', '["Haute Inc", "Haute LLC", "Haute Intl"]'),
('expenseCategories', '["Flights", "Hotels", "Meals", "Supplies", "Transportation", "Marketing Materials", "Shipping", "Entertainment", "Other"]');

-- Verify data counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Settings', COUNT(*) FROM app_settings;

