// Netlify Scheduled Function - Generates prediction events every 15 minutes
// Trigger: scheduled every 15 min via netlify.toml
// Also generates 5-minute crypto events (kripto-5dk) every 5 minutes
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const GATEIO_BASE = 'https://api.gateio.ws/api/v4/spot';
const CATEGORIES = ['hava-durumu', 'ekonomi', 'spor', 'gundem', 'teknoloji', 'kultur-sanat'];

// ─── Gate.io helpers (server-side, no CORS) ───────────────────────────────────
async function gateTickers(pair) {
  const symbol = pair.replace('USDT', '_USDT');
  const res = await fetch(`${GATEIO_BASE}/tickers?currency_pair=${symbol}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ? parseFloat(data[0].last) : null;
}

async function gate5mKline(pair) {
  const symbol = pair.replace('USDT', '_USDT');
  const res = await fetch(`${GATEIO_BASE}/candlesticks?currency_pair=${symbol}&interval=5m&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  // Gate format: [timestamp_ms, quote_volume, close, high, low, open, base_volume]
  if (!data || !data[0]) return null;
  return {
    close: parseFloat(data[0][2]),
    open: parseFloat(data[0][5]),
    high: parseFloat(data[0][3]),
    low: parseFloat(data[0][4]),
    timestamp: parseInt(data[0][0]) * 1000,
  };
}

async function gatePrices() {
  const [btc, eth, xrp] = await Promise.all([
    gateTickers('BTCUSDT'),
    gateTickers('ETHUSDT'),
    gateTickers('XRPUSDT'),
  ]);
  return { btc, eth, xrp };
}

// ─── 5-minute crypto events ───────────────────────────────────────────────────
const CRYPTO_5M = [
  { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, yRange: 100, icon: '₿', accent: '#f7931a' },
  { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, yRange: 5,   icon: 'Ξ',  accent: '#627eea' },
  { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, yRange: 0.005, icon: '✕', accent: '#00aae4' },
];

function thresholdFrom(price, yRange) {
  return +(price + yRange / 2).toFixed(yRange < 1 ? 6 : 0);
}

function next5MinDeadline() {
  const now = Date.now();
  // Round up to next 5-minute mark
  const ms = now;
  const rem = ms % (5 * 60 * 1000);
  const next5 = rem === 0 ? ms : ms + (5 * 60 * 1000 - rem);
  return new Date(next5 + 5 * 60 * 1000).toISOString(); // window closes 5 min after open
}

async function generate5MinEvents() {
  const prices = await gatePrices();
  const deadline = next5MinDeadline();

  const events = [];

  for (const c of CRYPTO_5M) {
    let price = null;
    let openPrice = null;

    if (c.symbol === 'BTC' && prices.btc) price = prices.btc;
    if (c.symbol === 'ETH' && prices.eth) price = prices.eth;
    if (c.symbol === 'XRP' && prices.xrp) price = prices.xrp;

    if (price === null) continue;

    openPrice = price; // use current price as opening reference

    // Threshold = mid point of yRange around current price
    const threshold = thresholdFrom(price, c.yRange);
    const question = `${c.icon} ${c.symbol} — Sonraki 5 dakikada $${threshold.toFixed(c.decimals)} seviyesini geçer mi?`;

    events.push({
      question,
      category: 'kripto-5dk',
      deadline,
      references: [{ title: 'Gate.io', url: `https://www.gate.io/tr/trade/${c.pair}` }],
      status: 'active',
      opening_price: openPrice,
      threshold,
      price_source: 'gateio',
      llm_reasoning: '5-min crypto window from Gate.io',
    });
  }

  return events;
}

// ─── News-based LLM events ────────────────────────────────────────────────────
async function fetchTurkeyNews() {
  const queries = [
    'Turkey news today 2025',
    'Türkiye gündem haberler bugün',
    'Turkey weather forecast today',
    'Borsa İstanbul döviz bugün',
    'Türkiye spor haberleri bugün'
  ];

  const newsItems = [];
  for (const q of queries) {
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const html = await res.text();
        const titleRegex = /class="result__a"[^>]*>([^<]+)<\/a>/g;
        const urlRegex = /class="result__a" href="([^"]+)"/g;
        let tMatch, uMatch;
        const titles = [];
        const urls = [];
        while ((tMatch = titleRegex.exec(html)) !== null) titles.push(tMatch[1].trim());
        while ((uMatch = urlRegex.exec(html)) !== null) urls.push(uMatch[1]);
        for (let i = 0; i < Math.min(2, titles.length); i++) {
          newsItems.push({ title: titles[i], url: urls[i] || '' });
        }
      }
    } catch (e) {
      console.error('News fetch error:', e.message);
    }
  }
  return newsItems;
}

async function generateEventsFromNews(newsItems) {
  const today = new Date().toISOString().split('T')[0];
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const newsSummary = newsItems.map((n, i) => `${i + 1}. ${n.title} (${n.url || 'URL Yok'})`).join('\n');

  let response = null;
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pm-turkish.netlify.app'
      },
      body: JSON.stringify({
        model: 'openrouter/elephant-alpha',
        messages: [
          {
            role: 'system',
            content: `Sen bir Türk tahmin platformu için event (olay) üreticisisin.
Görevin: Güncel haberlerden ve trendlerden yola çıkarak EVET/HAYIR tahmin soruları oluşturmak.

KURALLAR:
- Her soru 24 saat içinde net bir şekilde çözülebilmeli
- Sorular EVET veya HAYIR ile cevaplanabilmeli
- Manipüle edilemez, kanıtlanabilir olmalı
- "Yarın İstanbul'da yağmur yağacak mı?" gibi somut sorular
- "Birisi X yapacak mı" gibi spekulatif sorular OLMAZ
- Mutlaka referans linki (haber kaynağı) ekle
- JSON formatında yanıt ver, başka hiçbir şey yazma

BUGÜN: ${today}

GÜNCEL HABERLER:
${newsSummary}`
          },
          {
            role: 'user',
            content: `Bana tam 3 adet Türkiye temalı EVET/HAYIR tahmin sorusu üret.
Format: Sadece JSON array olarak yanıt ver:
[
  {
    "question": "Soru metni Türkçe",
    "category": "hava-durumu|ekonomi|spor|gundem|teknoloji|kultur-sanat",
    "deadline": "${deadline}",
    "sources": [{"title": "Haber başlığı", "url": "https://..."}]
  }
]`
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    });
    if (response.ok) break;
    console.warn(`OpenRouter attempt ${attempt} failed: ${response.status}`);
    if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON array');
  return JSON.parse(jsonMatch[0]);
}

async function checkDuplicateEvents(events) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=question&status=eq.active`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) return events;
  const existing = await res.json();
  const existingQuestions = existing.map(e => e.question.toLowerCase());
  return events.filter(e => !existingQuestions.includes(e.question.toLowerCase()));
}

async function insertEvents(events) {
  if (events.length === 0) return 0;
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(events)
  });
  if (!insertRes.ok) {
    const errBody = await insertRes.text();
    throw new Error(`Supabase insert error: ${insertRes.status} - ${errBody}`);
  }
  return events.length;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.handler = async (event, context) => {
  try {
    console.log('🔄 Scheduled event: Generating prediction events...');

    // ── 1. Generate 5-minute crypto events ──
    console.log('₿ Generating 5-minute crypto events from Gate.io...');
    const fiveMinEvents = await generate5MinEvents();
    console.log(`  Generated ${fiveMinEvents.length} 5-min events`);

    // Remove duplicates for 5-min events (same question already active)
    const unique5m = await checkDuplicateEvents(fiveMinEvents);
    const inserted5m = await insertEvents(unique5m);
    console.log(`  Inserted ${inserted5m} 5-min events`);

    // ── 2. Generate LLM news events ──
    console.log('📰 Fetching Turkey news...');
    const news = await fetchTurkeyNews();
    console.log(`Found ${news.length} news items`);

    console.log('🤖 Calling LLM to generate events...');
    const rawEvents = await generateEventsFromNews(news);
    console.log(`LLM generated ${rawEvents.length} events`);

    const uniqueNews = await checkDuplicateEvents(rawEvents);
    const insertedNews = await insertEvents(uniqueNews.map(e => ({
      question: e.question,
      category: e.category || 'gundem',
      deadline: e.deadline,
      references: e.sources || [],
      status: 'active',
      llm_reasoning: 'Generated from news analysis'
    })));
    console.log(`Inserted ${insertedNews} news events`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Generated ${insertedNews} news + ${inserted5m} crypto events`,
      })
    };
  } catch (error) {
    console.error('❌ Error in scheduled event generation:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
