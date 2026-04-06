// Netlify Function - Fetch events from Supabase
// If ?past=true → returns all events (past log, including active)
// If ?past=false/absent → returns active events (homepage)
const SUPABASE_URL = 'https://aeykrdfsghbmrnjcxqyu.supabase.co';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWtyZGZzZ2hibXJuamN4cXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5NDExMywiZXhwIjoyMDkxMDcwMTEzfQ.ZU7Ct9IwmSG4Pe79MbL2g2bykGihyZdnoXwOxC8Pids';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWtyZGZzZ2hibXJuamN4cXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTQxMTMsImV4cCI6MjA5MTA3MDExM30.DAA_oUpX3FGv-kaK_ap2XcQJLB7n7uwPPy76xP4j5zc';

function getApiKey() {
  return SERVICE_ROLE;
}

function buildQuery(past) {
  if (past) {
    return '?order=created_at.desc&select=*';
  }
  return '?status=eq.active&order=created_at.desc&select=*';
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const isPast = event.queryStringParameters?.past === 'true';
    const apiKey = getApiKey();

    const query = buildQuery(isPast);
    const url = `${SUPABASE_URL}/rest/v1/events${query}`;

    const res = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Supabase ${res.status}: ${body.slice(0,200)}`);
    }

    const data = await res.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
