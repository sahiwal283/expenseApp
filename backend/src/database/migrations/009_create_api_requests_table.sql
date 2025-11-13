-- Migration: Create API Requests Tracking Table
-- Description: Stores detailed information about API requests for analytics
-- Created: 2025-10-27

CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_api_requests_endpoint ON api_requests(endpoint);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX idx_api_requests_status_code ON api_requests(status_code);
CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);

-- Automatically delete old API request logs (keep last 30 days)
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void AS $$
BEGIN
    DELETE FROM api_requests WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE api_requests IS 'Stores API request logs for analytics and monitoring';
COMMENT ON COLUMN api_requests.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_requests.endpoint IS 'Normalized endpoint path (e.g., /api/expenses/:id instead of /api/expenses/123)';

