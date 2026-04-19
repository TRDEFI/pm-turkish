// Netlify Function - Fetch events from Supabase (with optional vote counts)
// ?past=true → returns all events (past log)
// ?past=false/absent → returns active events (homepage)
// ?category=kripto-5dk → filter by category
// ?includeVotes=true → include EVET/HAYIR vote counts per event
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SERVICE_ROLE_KEY;

function getApiKey() { return SERVICE_ROLE; }

function buildConditions(params) {
  const conditions = [];
  if (params.past === 'true') {
    conditions.push('status=eq.resolved');
  } else if (params.past === 'false') {
    conditions.push('status=eq.active');
  }
  if (params.category) {
    conditions.push(`category=eq.${params.category}`);
  }
  return conditions;
}

function buildEventsQuery(params) {
  const conditions = buildConditions(params);
  const where = conditions.length > 0 ? conditions.join('&') : 'status=eq.active';
  return `?${where}&order=deadline.asc&select=*`;
}

async function supabaseFetch(path, apiKey) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function getActiveEventIds(apiKey) {
  // Get IDs of active events
  const conditions = ['status=eq.active'];
  const where = conditions.join('&');
  const data = await supabaseFetch(`events?${where}&select=id`, apiKey);
  return Array.isArray(data) ? data.map(e => e.id) : [];
}

async function getVoteCounts(eventIds, apiKey) {
  if (!eventIds.length) return {};
  // Fetch votes for all active event IDs
  // PostgreSQL: WHERE event_id IN (...)
  // Supabase REST: use ge=id for range, or multiple eq calls
  // Simpler: fetch all votes and filter in JS (active events are limited)
  const votes = await supabaseFetch('votes?select=event_id,choice', apiKey);
  if (!Array.isArray(votes)) return {};

  const counts = {};
  for (const v of votes) {
    if (!counts[v.event_id]) counts[v.event_id] = { evet: 0, hayir: 0 };
    if (v.choice === 0) counts[v.event_id].evet++;
    else if (v.choice === 1) counts[v.event_id].hayir++;
  }
  return counts;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const params = event.queryStringParameters || {};
    const apiKey = getApiKey();

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // Fetch events
    const query = buildEventsQuery(params);
    let events = await supabaseFetch(`events${query}`, apiKey);

    // Fetch vote counts if requested
    const includeVotes = params.includeVotes === 'true';
    if (includeVotes) {
      const activeIds = events.map(e => e.id).filter(Boolean);
      const voteCounts = await getVoteCounts(activeIds, apiKey);
      events = events.map(evt => ({
        ...evt,
        _votes: voteCounts[evt.id] || { evet: 0, hayir: 0 }
      }));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(events)
    };
  } catch (error) {
    console.error('fetch-events error:', error.message);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
