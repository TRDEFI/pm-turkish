// Run: node scripts/create-comments-table.js
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hglivebdukoxdjmasycj.supabase.co';
const SERVICE_KEY = process.env.SERVICE_ROLE_KEY;

async function rpc(sql) {
  const body = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    const data = JSON.stringify({ query: sql });
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Creating comment_pool table...');

  // Create comment_pool table
  const r1 = await rpc(`
    CREATE TABLE IF NOT EXISTS comment_pool (
      id BIGSERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
      category TEXT CHECK (category IN ('crypto', 'general', 'weather', 'fx')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('comment_pool table:', r1.status, r1.body);

  // Create index
  const r2 = await rpc(`CREATE INDEX IF NOT EXISTS idx_comment_pool_sentiment ON comment_pool(sentiment);`);
  console.log('index:', r2.status);

  // Add ai_comments column to events
  const r3 = await rpc(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_comments JSONB DEFAULT '[]'::jsonb;`);
  console.log('ai_comments column:', r3.status, r3.body);

  // RLS for comment_pool
  const r4 = await rpc(`ALTER TABLE comment_pool ENABLE ROW LEVEL SECURITY;`);
  console.log('RLS:', r4.status);
  const r5 = await rpc(`CREATE POLICY "public_read_comment_pool" ON comment_pool FOR SELECT USING (true);`);
  console.log('policy:', r5.status);

  console.log('✅ Done!');
}

main().catch(console.error);
