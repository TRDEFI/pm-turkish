// Create votes table via Supabase SQL endpoint
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGl2ZWJkdWtveGRqbWFzeWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU1MDc5OCwiZXhwIjoyMDkyMTI2Nzk4fQ.YeNipgylfxoo0_djERQXm8l3BiQZelrp0_zy63ww7oM';
const SUPABASE_URL = 'https://hglivebdukoxdjmasycj.supabase.co';

async function runSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query: sql,
      params: []
    })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS public.votes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
      choice TEXT NOT NULL CHECK (choice IN ('EVET', 'HAYIR')),
      user_id TEXT DEFAULT 'anonymous',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS votes_event_id_idx ON public.votes(event_id)`,
    `CREATE INDEX IF NOT EXISTS votes_user_id_idx ON public.votes(user_id)`,
    `CREATE INDEX IF NOT EXISTS votes_created_at_idx ON public.votes(created_at)`,
    `ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "votes_insert_anyone" ON public.votes; CREATE POLICY "votes_insert_anyone" ON public.votes FOR INSERT WITH CHECK (true)`,
    `DROP POLICY IF EXISTS "votes_select_anyone" ON public.votes; CREATE POLICY "votes_select_anyone" ON public.votes FOR SELECT USING (true)`,
  ];

  for (const sql of statements) {
    console.log('Running:', sql.substring(0, 60) + '...');
    const result = await runSql(sql);
    console.log('  Status:', result.status, result.body.substring(0, 100));
  }
  console.log('\n✅ Votes table creation complete!');
}

main().catch(console.error);