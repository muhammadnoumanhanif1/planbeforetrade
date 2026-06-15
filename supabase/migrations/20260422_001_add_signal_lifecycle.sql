-- supabase/migrations/20260422_001_add_signal_lifecycle.sql

ALTER TABLE signals
ADD COLUMN status TEXT NOT NULL DEFAULT 'WAITING',
ADD COLUMN result TEXT,
ADD COLUMN result_R REAL,
ADD COLUMN closed_at TIMESTAMPTZ;

ALTER TABLE signals
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON signals
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
