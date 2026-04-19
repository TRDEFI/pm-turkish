// Netlify Scheduled Function - Generates prediction events every 5 minutes
// Schedule: */5 * * * * (from netlify.toml)
// Generates: (1) 5-min crypto events from real Gate.io kline data
//            (2) Hardcoded Turkish prediction events

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GATEIO_BASE = 'https://api.gateio.ws/api/v4/spot';

// ─── Gate.io: fetch 5m candles ───────────────────────────────────────────
async function gate5mKlines(pair, limit = 3) {
  const symbol = pair.replace('USDT', '_USDT');
  const url = `${GATEIO_BASE}/candlesticks?currency_pair=${symbol}&interval=5m&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json(); // [ts_sec, quote_vol, close, high, low, open, base_vol, is_closed]
}

// ─── Crypto 5-min events from real Gate.io data ─────────────────────────
const CRYPTO_5M = [
  { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, yRange: 100,  icon: '₿', color: '#f7931a' },
  { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, yRange: 5,    icon: 'Ξ',  color: '#627eea' },
  { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, yRange: 0.005, icon: '✕', color: '#00aae4' },
];

// Round timestamp DOWN to nearest 5-min boundary
function floor5min(tsMs) {
  return tsMs - (tsMs % (5 * 60 * 1000));
}

async function generate5MinEvents() {
  const events = [];

  for (const c of CRYPTO_5M) {
    const klines = await gate5mKlines(c.pair, 2);
    if (!klines || klines.length < 1) {
      console.log(`  ${c.symbol}: no kline data`);
      continue;
    }

    // Last closed 5-min candle (index 0 = most recent)
    const last = klines[0];
    const tsSec = parseInt(last[0]);          // e.g. 1776554700
    const openPrice = parseFloat(last[5]);    // window open price
    const closePrice = parseFloat(last[2]);   // window close price

    // Threshold: mid of yRange above the close price
    const threshold = +(closePrice + c.yRange / 2).toFixed(c.decimals);

    // Deadline: window closes at tsSec+300, then resolution 5 min later → +600 sec
    // But we want the event to close 5 min AFTER the window opens
    // window_open = tsSec (rounded down), window_close = tsSec + 300
    // deadline = window_close + 300 = tsSec + 600
    const deadlineMs = (tsSec + 600) * 1000;
    const deadline = new Date(deadlineMs).toISOString();

    const question = `${c.icon} ${c.symbol}/TRY — Sonraki 5 dakikada $${threshold.toFixed(c.decimals)} geçer mi?`;

    events.push({
      question,
      category: 'kripto-5dk',
      deadline,
      references: [{ title: `Gate.io ${c.symbol}/USDT 5dk`, url: `https://www.gate.io/tr/trade/${c.pair}` }],
      status: 'active',
      opening_price: openPrice,
      threshold,
      price_source: 'gateio',
      llm_reasoning: `Gate.io 5m kline: window=${new Date(tsSec * 1000).toISOString()}, open=$${openPrice}, close=$${closePrice}`,
    });

    console.log(`  ${c.symbol}: open=${openPrice}, close=${closePrice}, threshold=${threshold}, deadline=${deadline}`);
  }

  return events;
}

// ─── Hardcoded Turkish events ───────────────────────────────────────────
async function generateStaticEvents() {
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const templates = [
    {
      question: '🏦 TCMB bu hafta faiz artırır mı?',
      category: 'ekonomi',
      sources: [{ title: 'TCMB', url: 'https://www.tcmb.gov.tr/' }],
    },
    {
      question: '📈 Borsa İstanbul (BIST 100) bu hafta yükselir mi?',
      category: 'ekonomi',
      sources: [{ title: 'KAP', url: 'https://www.kap.org.tr/' }],
    },
    {
      question: '⚽ Fenerbahçe bu sezon şampiyonluğu kazanır mı?',
      category: 'spor',
      sources: [{ title: 'TFF', url: 'https://www.tff.org/' }],
    },
    {
      question: '🌍 Global piyasalar bu hafta yükselişte mi?',
      category: 'ekonomi',
      sources: [{ title: 'Bloomberg', url: 'https://www.bloomberg.com/markets' }],
    },
    {
      question: '💵 Dolar/TL kuru 35 TL\'yi geçer mi?',
      category: 'ekonomi',
      sources: [{ title: 'TCMB', url: 'https://www.tcmb.gov.tr/kurlar' }],
    },
  ];

  // Deduplicate against active events
  const active = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.active&select=question`, {
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
  }).then(r => r.ok ? r.json() : []);

  const activeQs = new Set(active.map(e => e.question.toLowerCase()));

  return templates
    .filter(t => !activeQs.has(t.question.toLowerCase()))
    .map(t => ({
      question: t.question,
      category: t.category,
      deadline,
      references: t.sources,
      status: 'active',
      llm_reasoning: 'Static Turkish prediction event',
    }));
}

// ─── Cleanup: delete expired events (>24h old) to keep Supabase free-tier safe ───
async function cleanupExpired(apiKey) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Find IDs of expired events
  const r = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.active&deadline=lt.${cutoff}&select=id`, {
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
  });
  if (!r.ok) return 0;
  const expired = await r.json();
  if (!expired.length) return 0;

  const ids = expired.map(e => e.id).join(',');
  const del = await fetch(`${SUPABASE_URL}/rest/v1/events?id=in.(${ids})`, {
    method: 'DELETE',
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Prefer': 'return=minimal' }
  });
  return del.ok ? expired.length : 0;
}
  if (!events.length) { console.log('  Nothing to insert'); return 0; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(events)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Insert failed: ${res.status} ${err}`);
  }
  console.log(`  Inserted ${events.length} event(s)`);
  return events.length;
}

// ─── Main handler ────────────────────────────────────────────────────────
exports.handler = async () => {
  console.log('⏰ generate-events @', new Date().toISOString());
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'UNDEFINED');
  console.log('SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'SET' : 'UNDEFINED');
  console.log('OPENROUTER_API_KEY:', OPENROUTER_API_KEY ? 'SET' : 'UNDEFINED');

  try {
    // Cleanup first — keep only last 24h of active events
    console.log('🧹 Checking for expired events...');
    const cleaned = await cleanupExpired(SERVICE_ROLE_KEY);
    if (cleaned > 0) console.log(`  → Deleted ${cleaned} expired events`);
    else console.log('  → No expired events found');


    // 5-min crypto events from real Gate.io klines
    console.log('₿ Fetching Gate.io 5m klines...');
    const crypto5 = await generate5MinEvents();
    const ins5 = await insertEvents(crypto5);
    console.log(`  → ${ins5} crypto events inserted`);

    // Static Turkish events
    console.log('📰 Generating static events...');
    const statics = await generateStaticEvents();
    const insS = await insertEvents(statics);
    console.log(`  → ${insS} static events inserted`);

    console.log(`✅ Done: ${ins5} crypto + ${insS} static`);

    return {
      statusCode: 200,
      body: JSON.stringify({ crypto: ins5, static: insS, time: new Date().toISOString() })
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};