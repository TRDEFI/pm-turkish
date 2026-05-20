// Netlify Function - Fetch events from Supabase (with optional vote counts + AI comments)
// ?past=true → returns all events (past log)
// ?past=false/absent → returns active events (homepage)
// ?category=kripto-5dk → filter by category
// ?includeVotes=true → include EVET/HAYIR vote counts per event
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SERVICE_ROLE_KEY;

// ─── Pre-generated AI comment pool (generated once, rotates daily) ───
// These are diverse Turkish comments mimicking real user discussion.
// Rotated randomly per event — no API calls needed.
const COMMENT_POOL = [
  // Bullish - crypto
  { text: "Bitcoin güçlü destek üzerinde tutunuyor, yükseliş sinyali gibi görünüyor.", sentiment: "bullish", category: "crypto" },
  { text: "Boğa piyasası başlamış olabilir, dikkatli olmakta fayda var.", sentiment: "bullish", category: "crypto" },
  { text: "Hacim artıyor, fiyat hareketi güçlü görünüyor.", sentiment: "bullish", category: "crypto" },
  { text: "Altcoin sezonu yaklaşıyor olabilir, portföyü çeşitlendirmeli.", sentiment: "bullish", category: "crypto" },
  { text: "Düşüşler alım fırsatı olabilir, uzun vadeli baksak da iyidir.", sentiment: "bullish", category: "crypto" },
  { text: "Teknik göstergeiler olumlu, RSI 50'nin üzerinde.", sentiment: "bullish", category: "crypto" },
  { text: "Boğa bayrağı formasyonu görülüyor, hedef fiyat yüksek.", sentiment: "bullish", category: "crypto" },
  { text: "Bitcoin halving yaklaşıyor, tarihsel olarak her zaman yükseliş getirmiş.", sentiment: "bullish", category: "crypto" },
  { text: "Whale'lar biriktiriyor gibi görünüyor, HACİM verileri bunu gösteriyor.", sentiment: "bullish", category: "crypto" },
  { text: "ABD Fed faiz indirimi sinyalleri kripto için olumlu.", sentiment: "bullish", category: "crypto" },
  { text: "Ethereum 2.0 güncellemesi başarılı, ağ aktivitesi artıyor.", sentiment: "bullish", category: "crypto" },
  { text: "Kurumsal yatırımcılar giriş yapıyor, bu da fiyatı destekliyor.", sentiment: "bullish", category: "crypto" },
  // Bearish - crypto
  { text: "Fiyat direnç zonuna geldi, düzeltme gelebilir.", sentiment: "bearish", category: "crypto" },
  { text: "RSI aşırı alım bölgesinde, düzeltme riski yüksek.", sentiment: "bearish", category: "crypto" },
  { text: "Kısa vadeli yükseliş sürdürülebilir değil, dikkatli olmalı.", sentiment: "bearish", category: "crypto" },
  { text: "Büyük satış dalgası gelebilir, stop-loss kullanmakta fayda var.", sentiment: "bearish", category: "crypto" },
  { text: "Piyasa doygunluk işareti gösteriyor, tedbirli olmakta yarar var.", sentiment: "bearish", category: "crypto" },
  { text: "Kara cumartesi gelebilir uyarısı var, tedbirli olmak lazım.", sentiment: "bearish", category: "crypto" },
  { text: "Baltık dump sinyalleri görülüyor, kısa pozisyon düşünülebilir.", sentiment: "bearish", category: "crypto" },
  { text: "Makro ekonomik belirsizlikler devam ediyor, risk iştahı düşük.", sentiment: "bearish", category: "crypto" },
  { text: "Düzenleyici baskı artıyor, özellikle DeFi tarafında.", sentiment: "bearish", category: "crypto" },
  { text: "Teknik direnç çok güçlü, kırılması zor görünüyor.", sentiment: "bearish", category: "crypto" },
  // Neutral - crypto
  { text: "Piyasa kararsız, yatay seyir devam edebilir.", sentiment: "neutral", category: "crypto" },
  { text: "Bugün ABD verileri açıklanacak, piyasa bekleyişte.", sentiment: "neutral", category: "crypto" },
  { text: "Fiyat dar bir aralıkta sıkışmış, bir kırılma yakında gelebilir.", sentiment: "neutral", category: "crypto" },
  { text: "Volatilite düşük, büyük hareket öncesi sakinlik olabilir.", sentiment: "neutral", category: "crypto" },
  { text: "Binance ve Coinbase orderbook'ları dengeli görünüyor.", sentiment: "neutral", category: "crypto" },
  { text: "Kısa vadeli sinyaller karışık, dikkatli takip şart.", sentiment: "neutral", category: "crypto" },
  { text: "Hafta sonu işlem hacmi düşer, fiyat hareketi sınırlı kalabilir.", sentiment: "neutral", category: "crypto" },
  { text: "Piyasa Derinliği analizi yapmadan pozisyon almamak lazım.", sentiment: "neutral", category: "crypto" },
  // FX / Döviz
  { text: "Dolar/TL kritik direnç seviyesinde, takip etmek lazım.", sentiment: "neutral", category: "fx" },
  { text: "Euro güçleniyor, EUR/TRY yükselişe geçebilir.", sentiment: "bullish", category: "fx" },
  { text: "Merkez bankası toplantısı yaklaşıyor, faiz kararı piyasayı belirler.", sentiment: "neutral", category: "fx" },
  { text: "Enflasyon verisi yüksek çıkarsa TL değer kaybedebilir.", sentiment: "bearish", category: "fx" },
  { text: "Döviz kurları jeopolitik gelişmelere bağlı hareket ediyor.", sentiment: "neutral", category: "fx" },
  { text: "USD/TRY 40 TL üzerine çıkarsa ihracatçılar sevinebilir.", sentiment: "neutral", category: "fx" },
  // Weather
  { text: "Hava durumu raporuna göre yağmur bekleniyor, sıcaklık düşebilir.", sentiment: "neutral", category: "weather" },
  { text: "Meteoroloji fırtına uyarısı yaptı, dikkatli olmalı.", sentiment: "bearish", category: "weather" },
  { text: "Yarın güneşli hava bekleniyor, sıcaklık 20°C'yi geçebilir.", sentiment: "bullish", category: "weather" },
  { text: "İstanbul'da hafta sonu yağmur ihtimali %70.", sentiment: "neutral", category: "weather" },
  { text: "Ankara'da kar yağışı bekleniyor, ulaşım etkilenebilir.", sentiment: "bearish", category: "weather" },
  // General
  { text: "Bu piyasada en önemli şey duygularından bağımsız karar vermek.", sentiment: "neutral", category: "general" },
  { text: "Risk yönetimi her zaman öncelikli olmalı, sermayenin bir kısmını koru.", sentiment: "neutral", category: "general" },
  { text: "Bu tahmin tamamen kişisel görüşüme dayanıyor, yatırım tavsiyesi değildir.", sentiment: "neutral", category: "general" },
  { text: "Piyasaları analiz etmek sabır gerektirir, acele karar vermemek lazım.", sentiment: "neutral", category: "general" },
  { text: "Her gün işlem yapmak yerine stratejik fırsatları beklemek daha karlı.", sentiment: "neutral", category: "general" },
];

// Simple seeded random for determinism
function pickRandom(arr, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
  const idx = Math.abs(hash) % arr.length;
  return arr[idx];
}

function getCommentsForEvent(eventId, category) {
  // Pick 3 comments based on event ID + category hash
  const c1 = pickRandom(COMMENT_POOL, `${eventId}-${category}-0`);
  const c2 = pickRandom(COMMENT_POOL, `${eventId}-${category}-1`);
  const c3 = pickRandom(COMMENT_POOL, `${eventId}-${category}-2`);
  return [
    { ...c1, id: 1 },
    { ...c2, id: 2 },
    { ...c3, id: 3 },
  ];
}

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
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function getVoteCounts(eventIds, apiKey) {
  if (!eventIds || !eventIds.length) return {};
  const votes = await supabaseFetch('votes?select=event_id,choice', apiKey);
  if (!Array.isArray(votes)) return {};
  const counts = {};
  for (const v of votes) {
    if (!counts[v.event_id]) counts[v.event_id] = { evet: 0, hayir: 0 };
    if (v.choice === 0 || v.choice === '0') counts[v.event_id].evet++;
    else if (v.choice === 1 || v.choice === '1') counts[v.event_id].hayir++;
  }
  return counts;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }

    const params = event.queryStringParameters || {};
    const apiKey = SERVICE_ROLE;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // Fetch events
    const query = buildEventsQuery(params);
    let events = await supabaseFetch(`events${query}`, apiKey);

    // Add vote counts if requested
    const includeVotes = params.includeVotes === 'true';
    if (includeVotes) {
      const activeIds = events.map(e => e.id).filter(Boolean);
      const voteCounts = await getVoteCounts(activeIds, apiKey);
      events = events.map(evt => ({
        ...evt,
        _votes: voteCounts[evt.id] || { evet: 0, hayir: 0 }
      }));
    }

    // Always add AI comments (no API calls — uses pre-generated pool)
    events = events.map(evt => ({
      ...evt,
      ai_comments: getCommentsForEvent(evt.id || Math.random().toString(), evt.category || 'general')
    }));

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
