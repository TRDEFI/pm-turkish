// Netlify Function - Fetch active events from Supabase for frontend
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aytotwrddgjbstcprbev.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdqYnN0Y3ByYmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTMzMDAsImV4cCI6MjA5MDk4OTMwMH0.FgCB3RqtEQVmBypndva4RZQHPW_uref_Vt-OqTigZW8';

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
