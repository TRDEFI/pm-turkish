// Netlify Function - Fetch events from Supabase
// ?past=true → returns all events (past log)
// ?past=false/absent → returns active events (homepage)
// ?category=kripto-5dk → filter by category
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
