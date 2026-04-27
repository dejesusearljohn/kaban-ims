-- daily_check_items: stores per-item condition results linked to a daily check session
CREATE TABLE IF NOT EXISTS daily_check_items (
  check_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  check_id       INTEGER  NOT NULL REFERENCES daily_checks(check_id) ON DELETE CASCADE,
  item_id        INTEGER  NOT NULL REFERENCES inventory(item_id),
  condition      TEXT     NOT NULL CHECK (condition IN ('serviceable', 'unserviceable')),
  scanned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remarks        TEXT,
  uid            TEXT     NOT NULL DEFAULT gen_random_uuid()::TEXT
);

-- Add status + daily_check_id to shift_turnovers
ALTER TABLE shift_turnovers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'disapproved')),
  ADD COLUMN IF NOT EXISTS daily_check_id INTEGER REFERENCES daily_checks(check_id);
