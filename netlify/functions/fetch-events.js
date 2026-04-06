// Netlify Function - Fetch active events from Supabase for frontend
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aytotwrddgjbstcprbev.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  try {
    // Allow CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: ''
      };
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?status=eq.active&order=created_at.desc&select=*`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      }
    );

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.status}`);
    }

    const events = await res.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(events)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
