// Verify Supabase events table exists
const SUPABASE_URL = 'https://aytotwrddgjbstcprbev.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdqYnN0Y3ByYmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTMzMDAsImV4cCI6MjA5MDk4OTMwMH0.FgCB3RqtEQVmBypndva4RZQHPW_uref_Vt-OqTigZW8';

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&limit=1`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  console.log('Status:', res.status);
  if (res.status === 200) {
    console.log('Table EXISTS and accessible');
    const data = await res.json();
    console.log('Data:', data);
  } else if (res.status === 404) {
    console.log('Not found - may need to retry');
    const body = await res.text();
    console.log('Body:', body);
  }
}

main();
