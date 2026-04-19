// Standalone script to create comment_pool table via Supabase Management API
// Usage: node scripts/supabase-admin.js

const https = require('https');

const PROJECT_REF = 'hglivebdukoxdjmasycj';
// Get this from Supabase dashboard > Settings > API
const MANAGEMENT_KEY = process.env.SUPABASE_MANAGEMENT_KEY || '';

const paths = {
  listTables: `/management/v1/projects/${PROJECT_REF}/postgres/tables`,
  createTable: `/management/v1/projects/${PROJECT_REF}/postgres/tables`,
  addColumn: (tableId) => `/management/v1/projects/${PROJECT_REF}/postgres/tables/${tableId}/columns`,
};

function managementRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://${PROJECT_REF}.supabase.co${paths.createTable}`);
    const data = JSON.stringify(body);
    const opts = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': MANAGEMENT_KEY,
        'Authorization': `Bearer ${MANAGEMENT_KEY}`,
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
}

async function main() {
  if (!MANAGEMENT_KEY) {
    console.log('SUPABASE_MANAGEMENT_KEY not set — skipping DB setup.');
    console.log('Please create these manually in Supabase dashboard:');
    console.log('1. comment_pool table: id,text,sentiment,category,created_at');
    console.log('2. events.ai_comments: JSONB default []');
    return;
  }

  // List existing tables
  const r = await managementRequest(paths.listTables, 'GET', null);
  console.log('Tables:', r.status, r.body.substring(0, 300));
}

main().catch(console.error);
