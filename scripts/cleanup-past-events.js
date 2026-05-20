// scripts/cleanup-past-events.js
// Usage: node scripts/cleanup-past-events.js
// Cleans up expired events from Supabase — keeps only last 24 hours
// Run manually or via cron

const https = require('https');
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hglivebdukoxdjmasycj.supabase.co';

if (!SERVICE_ROLE_KEY) {
  console.error('SERVICE_ROLE_KEY not set — cannot modify Supabase');
  process.exit(1);
}

async function supabaseReq(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': method === 'DELETE' ? 'return=minimal' : 'return=representation',
      }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  console.log(`Cleaning events older than: ${cutoff}`);

  // Count old events first
  const countRes = await supabaseReq('GET', `/rest/v1/events?status=eq.active&deadline=lt.${cutoff}&select=id`, SERVICE_ROLE_KEY);
  if (countRes.status !== 200) {
    console.error('Count failed:', countRes.body);
    return;
  }
  const oldEvents = countRes.body;
  console.log(`Found ${oldEvents.length} expired events to delete`);

  if (oldEvents.length === 0) {
    console.log('Nothing to clean');
    return;
  }

  // Delete in batches of 100
  const batchSize = 100;
  let deleted = 0;
  for (let i = 0; i < oldEvents.length; i += batchSize) {
    const batch = oldEvents.slice(i, i + batchSize);
    const ids = batch.map(e => e.id).join(',');
    const delRes = await supabaseReq('DELETE', `/rest/v1/events?id=in.(${ids})`, null, SERVICE_ROLE_KEY);
    console.log(`Batch ${i / batchSize + 1}: ${delRes.status} (${batch.length} deleted)`);
    if (delRes.status >= 300) {
      console.error('Delete error:', delRes.body);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`✅ Cleanup complete — ${deleted}/${oldEvents.length} expired events deleted`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
