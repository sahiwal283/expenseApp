-- Expense message notifications: local delivery state for Midas-owned threads.
-- Trade Show stores no authoritative message data. These rows exist only to
-- answer "has THIS Trade Show user seen this message", which Midas cannot know.

CREATE TABLE IF NOT EXISTS expense_message_notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Idempotency key. The scanner advances its cursor only after a batch
  -- commits, so a crash mid-batch re-reads the same messages; this makes the
  -- redelivery a no-op instead of a duplicate notification.
  midas_message_id   UUID NOT NULL UNIQUE,
  midas_expense_id   UUID NOT NULL,
  expense_ref_id     UUID,
  sender_name        TEXT NOT NULL,
  sender_role        TEXT,
  body_snippet       TEXT NOT NULL,
  request_type       TEXT,
  message_created_at TIMESTAMPTZ NOT NULL,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_message_notifications_user_unread_idx
  ON expense_message_notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS expense_message_notifications_expense_idx
  ON expense_message_notifications (user_id, midas_expense_id);

-- Scanner watermark. One row per source app.
CREATE TABLE IF NOT EXISTS midas_message_sync_state (
  source_app   TEXT PRIMARY KEY,
  cursor       TEXT,
  last_scan_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
