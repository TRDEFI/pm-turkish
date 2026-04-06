// Netlify Function - Fetch events from Supabase
// If ?past=true → returns resolved events (past log)
// If ?past=false/absent → returns active events (homepage)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aytotwrddgjbstcprbev.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

function getApiKey() {
  // Use service_role if available; fallback to anon
  return SERVICE_ROLE || ANON_KEY;
}

function buildQuery(past) {
  if (past) {
    // Past log: all events that have a result (resolved)
    return '?result=not.is.null&order=created_at.desc&select=*';
  }
  // Default: active upcoming events
  return '?status=eq.active&order=created_at.desc&select=*';
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const isPast = event.queryStringParameters?.past === 'true';
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');

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
