// Create the events table in Supabase
const SUPABASE_URL = 'https://aytotwrddgjbstcprbev.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdqYnN0Y3ByYmV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQxMzMwMCwiZXhwIjoyMDkwOTg5MzAwfQ.byZ7ht0VJrcY_nUMakbBaq_IY-6OaKhcqjZvf4b9oI8';

const createTableSQL = `
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'genel',
  option_yes TEXT DEFAULT 'EVET',
  option_no TEXT DEFAULT 'HAYIR',
  deadline TIMESTAMPTZ NOT NULL,
  references JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  result TEXT DEFAULT NULL,
  total_yes_bet NUMERIC DEFAULT 0,
  total_no_bet NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  llm_reasoning TEXT DEFAULT NULL,
  sources JSONB DEFAULT '[]'
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_deadline ON events(deadline);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public read (for frontend)
CREATE POLICY "events_public_select" ON events FOR SELECT USING (true);

-- Allow service role write (scheduled function)
CREATE POLICY "events_service_write" ON events FOR ALL USING (true);
`;

async function main() {
  console.log('Creating events table in Supabase...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_table_with_migration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: createTableSQL })
  }).catch(err => {
    console.error('Direct SQL not possible, trying table creation via management API...');
    return null;
  });

  // Supabase REST API doesn't let us run raw SQL via REST endpoint easily
  // Instead, let's create the table using the Supabase management API
  // For now, let's verify if the table exists by querying it
  
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  if (checkRes.status === 200 || checkRes.status === 404) {
    console.log('Need to create the table manually. Please run this SQL in Supabase Dashboard:');
    console.log('Go to: https://aytotwrddgjbstcprbev.supabase.co/project/default/sql/new');
    console.log('---');
    console.log(createTableSQL);
  } else if (checkRes.status === 400) {
    console.log('Table does not exist. Please run the SQL in Supabase Dashboard.');
    console.log('Go to: https://aytotwrddgjbstcprbev.supabase.co/project/default/sql/new');
    console.log('');
    console.log('Copy and paste this:');
    console.log('---');
    console.log(createTableSQL);
  }
}

main();
