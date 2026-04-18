// Netlify Function - Fetch events from Supabase
// ?past=true → returns all events (past log)
// ?past=false/absent → returns active events (homepage)
// ?category=kripto-5dk → filter by category
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SERVICE_ROLE_KEY;

function getApiKey() {
  return SERVICE_ROLE;
}

function buildQuery(params) {
  const conditions = [];
  if (params.past === 'true') {
    conditions.push('status=eq.resolved');
  } else if (params.past === 'false') {
    conditions.push('status=eq.active');
  }
  if (params.category) {
    conditions.push(`category=eq.${params.category}`);
  }
  const where = conditions.length > 0 ? conditions.join('&') : 'status=eq.active';
  return `?${where}&order=deadline.asc&select=*`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const params = event.queryStringParameters || {};
    const apiKey = getApiKey();
    const query = buildQuery(params);
    const url = `${SUPABASE_URL}/rest/v1/events${query}`;

    // Debug: log what we're using
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'UNDEFINED');
    console.log('SERVICE_ROLE:', SERVICE_ROLE ? 'SET' : 'UNDEFINED');
    console.log('URL:', url ? 'SET' : 'UNDEFINED');

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing env vars',
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_ROLE
        })
      };
    }

    const res = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Supabase ${res.status}: ${body.slice(0, 200)}` })
      };
    }

    const data = await res.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('fetch-events error:', error.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message, stack: error.stack }) };
  }
};
