-- Creates a table to persist entry price hit timestamps per user per symbol.
-- Replaces the previous localStorage approach so data is available across devices
-- and is updated even when the site is not being browsed.

CREATE TABLE IF NOT EXISTS public.entry_timestamps (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  hit_at        TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, symbol)
);

-- Automatically update updated_at on every row update
CREATE OR REPLACE FUNCTION public.entry_timestamps_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_timestamps_updated_at
BEFORE UPDATE ON public.entry_timestamps
FOR EACH ROW
EXECUTE FUNCTION public.entry_timestamps_set_updated_at();

-- Row Level Security: each user can only access their own rows
ALTER TABLE public.entry_timestamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entry timestamps"
  ON public.entry_timestamps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own entry timestamps"
  ON public.entry_timestamps FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own entry timestamps"
  ON public.entry_timestamps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own entry timestamps"
  ON public.entry_timestamps FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS entry_timestamps_user_id_idx
  ON public.entry_timestamps (user_id);
