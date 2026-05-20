// Netlify Scheduled Function - Generates AI comment pool ONCE per day
// Runs at 06:00 UTC (09:00 Istanbul) via netlify.toml
// Generates 50 diverse Turkish comments in a SINGLE OpenRouter API call
// Comments are stored in Supabase comment_pool table

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Ensure comment_pool table exists (idempotent)
async function ensureTable(apiKey) {
  // Try to create table via POST (will 400 if exists — that's fine)
  await fetch(`${SUPABASE_URL}/rest/v1/comment_pool`, {
    method: 'POST',
    headers: {
      'apikey': apiKey, 'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ id: 0, text: 'placeholder', sentiment: 'neutral', category: 'general' })
  }).catch(() => {});
  // Add ai_comments column to events if not exists
  await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&limit=1`, {
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
  }).catch(() => {});
}

const SYSTEM_PROMPT = `Sen Türkçe bir kripto/tahmin piyasası yorumcususun. 50 farklı, kısa, doğal Türkçe yorum üret. Her yorum 1-2 cümle olmalı. Yorumlar "garip" veya "刻板" olmamalı — gerçek bir insan gibi olmalı. Yorumlar şu kategorilerden olmalı: bullish (yatırımı destekleyen), bearish (endişe veren), neutral (tarafsız). Kripto, genel, hava, döviz konularında olabilir. Her yorumu ayrı satırda yaz ve başına sentiment:bullish/bearish/neutral ve category:kripto/general/weather/fx etiketi koy. Örnek:
sentiment:bullish category:krypto Bitcoin güçlü görünüyor, $75K desteği sağlam.
sentiment:bearish category:fx Dolar/TL yükseliyor, dikkat etmeli.
NOT: Sadece 50 yorum yaz, başka bir şey yazma.`;

// Fetch existing comment count
async function getExistingCount(apiKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/comment_pool?select=id`, {
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

// Insert comments batch
async function insertComments(comments, apiKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/comment_pool`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(comments)
  });
  return res.ok;
}

exports.handler = async () => {
  console.log('[generate-comments] Starting @', new Date().toISOString());

  try {
    // Ensure table exists
    await ensureTable(SERVICE_ROLE_KEY);

    // Check if we already have enough comments today
    const existing = await getExistingCount(SERVICE_ROLE_KEY);
    if (existing >= 40) {
      console.log(`[generate-comments] Already have ${existing} comments, skipping.`);
      return { statusCode: 200, body: JSON.stringify({ skip: true, count: existing }) };
    }

    // Call OpenRouter ONCE for all 50 comments
    console.log('[generate-comments] Calling OpenRouter for 50 comments...');
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pm-turkish.netlify.app',
        'X-Title': 'pm-turkish comments',
      },
      body: JSON.stringify({
        model: 'openrouter/elephant-alpha',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '50 Türkçe yorum üret.' }
        ],
        max_tokens: 2000,
        temperature: 0.9,
      })
    });

    if (!orRes.ok) {
      const err = await orRes.text();
      console.error('[generate-comments] OpenRouter error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'OpenRouter failed' }) };
    }

    const orData = await orRes.json();
    const raw = orData.choices?.[0]?.message?.content || '';
    console.log('[generate-comments] OpenRouter response length:', raw.length);

    // Parse comments from response
    const lines = raw.split('\n').filter(l => l.trim());
    const comments = [];

    for (const line of lines) {
      // Expected format: "sentiment:X category:Y comment text"
      const match = line.match(/^sentiment:(bullish|bearish|neutral)\s+category:(kripto|general|weather|fx)\s+(.+)$/i);
      if (match) {
        comments.push({
          sentiment: match[1].toLowerCase(),
          category: match[2].toLowerCase(),
          text: match[3].trim(),
          created_at: new Date().toISOString(),
        });
      }
    }

    if (comments.length === 0) {
      // Fallback: parse differently
      const fallback = raw.split('\n').filter(l => l.trim().length > 10).slice(0, 50);
      for (const text of fallback) {
        comments.push({
          sentiment: 'neutral',
          category: 'general',
          text: text.trim(),
          created_at: new Date().toISOString(),
        });
      }
    }

    console.log(`[generate-comments] Parsed ${comments.length} comments, inserting...`);

    // Insert into Supabase
    const inserted = await insertComments(comments, SERVICE_ROLE_KEY);
    if (!inserted) throw new Error('Insert failed');

    console.log(`[generate-comments] ✅ Done. ${comments.length} comments inserted. Total pool: ${existing + comments.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        generated: comments.length,
        total: existing + comments.length,
        time: new Date().toISOString(),
      })
    };

  } catch (err) {
    console.error('[generate-comments] Fatal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
