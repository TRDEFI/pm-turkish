// Netlify Scheduled Function - Generates DAILY events: weather + crypto-daily + FX
// Schedule: daily at 00:05 UTC (netlify.toml)
// This runs ONCE per day and creates fresh events for the next 24h
// Unlike generate-events.js (every 5 min for kripto-5dk), this handles daily categories

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Gate.io
const GATEIO_BASE = 'https://api.gateio.ws/api/v4/spot';

// ─── Helpers ────────────────────────────────────────────────────────────
function gateSymbol(pair) { return pair.replace('USDT', '_USDT'); }

async function gatePrice(pair) {
  const sym = gateSymbol(pair);
  const r = await fetch(`${GATEIO_BASE}/tickers?currency_pair=${sym}`);
  if (!r.ok) return null;
  const data = await r.json();
  return data[0]?.last ? parseFloat(data[0].last) : null;
}

// ─── 1. WEATHER EVENTS ─────────────────────────────────────────────────
// Fetch real wttr.in data for 8 Turkish cities, then use OpenRouter to
// generate dynamic YES/NO prediction questions in Turkish.
async function generateWeatherEvents() {
  const cities = [
    { city: 'İstanbul', cityEn: 'Istanbul', threshold: 15 },
    { city: 'Ankara',   cityEn: 'Ankara',   threshold: 12 },
    { city: 'İzmir',    cityEn: 'Izmir',    threshold: 18 },
    { city: 'Samsun',   cityEn: 'Samsun',   threshold: 15 },
    { city: 'Antalya',  cityEn: 'Antalya',  threshold: 20 },
    { city: 'Trabzon',  cityEn: 'Trabzon',  threshold: 15 },
    { city: 'Bursa',    cityEn: 'Bursa',    threshold: 15 },
    { city: 'Adana',    cityEn: 'Adana',    threshold: 20 },
  ];

  // Fetch weather for all cities in parallel
  const weatherData = await Promise.all(
    cities.map(async ({ city, cityEn, threshold }) => {
      try {
        const r = await fetch(`https://wttr.in/${encodeURIComponent(cityEn)}?format=j1`);
        if (!r.ok) return null;
        const data = await r.json();
        const curr = data.current_condition?.[0];
        const tomorrow = data.weather?.[1]; // day after today
        const currentTemp  = curr ? parseInt(curr.temp_C) : null;
        const tomorrowMax  = tomorrow ? parseInt(tomorrow.maxTemp_C) : null;
        const tomorrowMin  = tomorrow ? parseInt(tomorrow.minTemp_C) : null;
        const weatherCode  = curr ? parseInt(curr.weatherCode) : null;
        return { city, cityEn, threshold, currentTemp, tomorrowMax, tomorrowMin, weatherCode };
      } catch { return null; }
    })
  );

  // OpenRouter prompt: generate a single sharp Turkish weather question
  const validCities = weatherData.filter(w => w !== null);
  const weatherSummary = validCities.map(w =>
    `${w.city}: şu an ${w.currentTemp}°C, yarın max ${w.tomorrowMax}°C / min ${w.tomorrowMin}°C`
  ).join('\n');

  const prompt = `Sen Türkiye için tahmin pazarı soruları üreten bir yapay zekasın. Aşağıdaki Türkiye şehirlerinin hava durumunu analiz et ve her şehir için tek bir ilgi çekici EVET/HAYIR tahmin sorusu oluştur.

Şehir verileri:
${weatherSummary}

Kurallar:
- Her soru Türkçe olmalı, "mı?" ile bitmeli
- Soru net bir EVET/HAYIR cevabı gerektirmeli
- Mevsim normallerine göre ilgi çekici eşik değerleri kullan
- Her şehir için farklı bir soru oluştur (verileri karşılaştırarak ilginç sorular sor)
- Her şehir için bir "threshold" değeri belirle (sıcaklık eşiği)
- Her şehir için "neden" kısa bir açıklama ekle

JSON formatında döndür:
{
  "events": [
    {
      "city": "İstanbul",
      "question": "SORU BURAYA",
      "threshold": SAYI,
      "reasoning": "NEDEN BURAYA"
    }
  ]
}

Sadece geçerli JSON döndür, açıklama ekleme.`;

  let events = [];
  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pm-turkish.netlify.app',
        'X-Title': 'pm-turkish daily weather',
      },
      body: JSON.stringify({
        model: 'openrouter/elephant-alpha',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.8,
      }),
    });

    if (orRes.ok) {
      const orData = await orRes.json();
      const content = orData?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        events = (parsed.events || []).map(e => {
          // Map LLM city name back to our data
          const cityData = validCities.find(w =>
            w.city.toLowerCase().includes(e.city?.toLowerCase()) ||
            (e.city?.toLowerCase().includes('stan') && w.city === 'İstanbul') ||
            (e.city?.toLowerCase().includes('ank') && w.city === 'Ankara')
          );
          const threshold = e.threshold || cityData?.threshold || 15;
          const tomorrow = new Date(Date.now() + 86400000);
          tomorrow.setHours(19, 0, 0, 0); // tomorrow 19:00
          const deadline = tomorrow.toISOString();

          return {
            question: e.question || `${cityData?.city || 'Şehir'} yarın 15°C üzerinde olur mu?`,
            category: 'hava',
            deadline,
            threshold,
            references: [{ title: `wttr.in ${cityData?.city || 'Şehir'}`, url: `https://wttr.in/${cityData?.cityEn || 'Turkey'}` }],
            status: 'active',
            llm_reasoning: e.reasoning || `Weather forecast for ${cityData?.city}`,
            opening_price: cityData?.currentTemp || 0,
            price_source: 'wttr.in',
          };
        });
      }
    } else {
      console.log('OpenRouter weather error:', orRes.status);
    }
  } catch (err) {
    console.log('Weather LLM error:', err.message);
  }

  // Fallback if LLM fails entirely
  if (events.length === 0) {
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(19, 0, 0, 0);
    const deadline = tomorrow.toISOString();
    events = validCities.map(w => ({
      question: `${w.city} yarın en yüksek ${w.threshold}°C'yi geçer mi?`,
      category: 'hava',
      deadline,
      threshold: w.threshold,
      references: [{ title: `wttr.in ${w.city}`, url: `https://wttr.in/${w.cityEn}` }],
      status: 'active',
      llm_reasoning: `Weather: ${w.city} current=${w.currentTemp}°C, tomorrow max=${w.tomorrowMax}°C`,
      opening_price: w.currentTemp || 0,
      price_source: 'wttr.in',
    }));
  }

  return events;
}

// ─── 2. CRYPTO DAILY EVENTS ───────────────────────────────────────────
// Fetch current prices and create threshold-based events for 6 tokens
async function generateCryptoDailyEvents() {
  const tokens = [
    { symbol: 'BTC',  pair: 'BTCUSDT',  decimals: 0,   pctAbove: 0.03 },
    { symbol: 'ETH',  pair: 'ETHUSDT',  decimals: 2,   pctAbove: 0.03 },
    { symbol: 'XRP',  pair: 'XRPUSDT',  decimals: 4,   pctAbove: 0.05 },
    { symbol: 'SOL',  pair: 'SOLUSDT',  decimals: 2,   pctAbove: 0.05 },
    { symbol: 'DOGE', pair: 'DOGEUSDT', decimals: 6,   pctAbove: 0.08 },
    { symbol: 'AVAX', pair: 'AVAXUSDT', decimals: 2,   pctAbove: 0.05 },
  ];

  const prices = await Promise.all(tokens.map(t => gatePrice(t.pair).then(p => ({ ...t, price: p }))));

  // End of tomorrow (UTC)
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setUTCHours(23, 59, 59, 0);
  const deadline = tomorrow.toISOString();

  return prices.map(t => {
    const threshold = t.price ? +(t.price * (1 + t.pctAbove)).toFixed(t.decimals) : t.threshold || 0;
    return {
      question: `${t.symbol} — yarın 23:59 UTC'ye kadar $${threshold.toFixed(t.decimals)} üzerine çıkar mı?`,
      category: 'kripto-gun',
      deadline,
      threshold,
      references: [{ title: `Gate.io ${t.symbol}/USDT`, url: `https://www.gate.io/tr/trade/${t.pair}` }],
      status: 'active',
      llm_reasoning: `Daily crypto: ${t.symbol} current=$${t.price}, threshold=$${threshold} (+${(t.pctAbove*100).toFixed(0)}%)`,
      opening_price: t.price || 0,
      price_source: 'gateio',
    };
  });
}

// ─── 3. FX (DÖVİZ) EVENTS ──────────────────────────────────────────────
async function fetchFX(base, target) {
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data.rates?.[target] ? parseFloat(data.rates[target]) : null;
  } catch { return null; }
}

async function generateFXEvents() {
  const pairs = [
    { symbol: 'USD', base: 'USD', target: 'TRY', decimals: 4, threshold: 42.0000, icon: '💵' },
    { symbol: 'EUR', base: 'EUR', target: 'TRY', decimals: 4, threshold: 45.5000, icon: '💶' },
    { symbol: 'GBP', base: 'GBP', target: 'TRY', decimals: 4, threshold: 53.0000, icon: '💷' },
  ];

  const rates = await Promise.all(pairs.map(async p => ({ ...p, price: await fetchFX(p.base, p.target) })));

  // Tomorrow 23:59 Turkey time = UTC+3 23:59 → UTC 20:59
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setUTCHours(20, 59, 0, 0);
  const deadline = tomorrow.toISOString();

  return rates.map(r => ({
    question: `${r.icon} ${r.symbol}/TRY — yarın 23:59 GMT+3'e kadar ${r.threshold.toFixed(r.decimals)}₺ üzerine çıkar mı?`,
    category: 'doviz',
    deadline,
    threshold: r.threshold,
    references: [{ title: 'open.er-api.com', url: 'https://open.er-api.com' }],
    status: 'active',
    llm_reasoning: `FX: ${r.symbol}/TRY current=${r.price}, threshold=${r.threshold}`,
    opening_price: r.price || 0,
    price_source: 'open.er-api.com',
  }));
}

// ─── Supabase insert ────────────────────────────────────────────────────
async function insertEvents(events) {
  if (!events.length) { console.log('  Nothing to insert'); return 0; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(events),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Insert failed: ${res.status} ${err}`);
  }
  return events.length;
}

// ─── Deduplicate: check existing active events ─────────────────────────
async function getActiveQuestions(category) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?status=eq.active&category=eq.${category}&select=question`,
      { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    if (!res.ok) return new Set();
    const rows = await res.json();
    return new Set(rows.map(r => r.question.toLowerCase()));
  } catch { return new Set(); }
}

// ─── Main handler ───────────────────────────────────────────────────────
exports.handler = async () => {
  console.log('🌅 generate-daily @', new Date().toISOString());

  try {
    // Weather
    console.log('🌤️ Fetching weather from wttr.in...');
    const weather = await generateWeatherEvents();
    const weatherActive = await getActiveQuestions('hava');
    const newWeather = weather.filter(e => !weatherActive.has(e.question.toLowerCase()));
    const insW = await insertEvents(newWeather);
    console.log(`  → ${insW} weather events inserted`);

    // Crypto daily
    console.log('📈 Fetching crypto daily from Gate.io...');
    const cryptoDaily = await generateCryptoDailyEvents();
    const cryptoActive = await getActiveQuestions('kripto-gun');
    const newCrypto = cryptoDaily.filter(e => !cryptoActive.has(e.question.toLowerCase()));
    const insC = await insertEvents(newCrypto);
    console.log(`  → ${insC} crypto daily events inserted`);

    // FX
    console.log('💱 Fetching FX rates...');
    const fx = await generateFXEvents();
    const fxActive = await getActiveQuestions('doviz');
    const newFx = fx.filter(e => !fxActive.has(e.question.toLowerCase()));
    const insF = await insertEvents(newFx);
    console.log(`  → ${insF} FX events inserted`);

    const total = insW + insC + insF;
    console.log(`✅ Daily generation complete: ${total} events (${insW} weather, ${insC} crypto-daily, ${insF} FX)`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        weather: insW, cryptoDaily: insC, fx: insF, total,
        time: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
