-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS city_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sessions integer DEFAULT 0 NOT NULL,
  total_minutes integer DEFAULT 0 NOT NULL,
  is_paid boolean DEFAULT false NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- If the table already exists, just add the is_paid column:
-- ALTER TABLE city_saves ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false NOT NULL;

ALTER TABLE city_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own save"
  ON city_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own save"
  ON city_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own save"
  ON city_saves FOR UPDATE
  USING (auth.uid() = user_id);
