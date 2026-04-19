-- Create AI comments pool table
CREATE TABLE IF NOT EXISTS comment_pool (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  category TEXT CHECK (category IN ('crypto', 'general', 'weather', 'fx')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for random selection
CREATE INDEX IF NOT EXISTS idx_comment_pool_sentiment ON comment_pool(sentiment);
CREATE INDEX IF NOT EXISTS idx_comment_pool_category ON comment_pool(category);

-- Add comments JSONB field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_comments JSONB DEFAULT '[]'::jsonb;

-- RLS
ALTER TABLE comment_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to comment_pool" ON comment_pool FOR ALL USING (true) WITH CHECK (true);
