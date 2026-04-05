// Netlify Scheduled Function - Generates prediction events every 15 minutes
// Trigger: scheduled every 15 min via netlify.toml
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aytotwrddgjbstcprbev.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdqYnN0Y3ByYmV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQxMzMwMCwiZXhwIjoyMDkwOTg5MzAwfQ.byZ7ht0VJrcY_nUMakbBaq_IY-6OaKhcqjZvf4b9oI8';
const OPENROUTER_API_KEY = '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';

const CATEGORIES = ['hava-durumu', 'ekonomi', 'spor', 'gundem', 'teknoloji', 'kultur-sanat'];

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
        // Extract titles/links from HTML
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

  // Retry logic for OpenRouter (free models sometimes return intermittent 401)
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
        model: 'openrouter/free',
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

    // If successful, break the retry loop
    if (response.ok) {
      break;
    }
    
    // Log the error and retry
    console.warn(`OpenRouter attempt ${attempt} failed: ${response.status}`);
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';

  // Extract JSON from the response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('LLM did not return valid JSON array');
  }

  return JSON.parse(jsonMatch[0]);
}

async function checkDuplicateEvents(events) {
  // Fetch existing active events to avoid duplicates
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

exports.handler = async (event, context) => {
  try {
    console.log('🔄 Scheduled event: Generating prediction events...');

    // Step 1: Fetch latest news
    console.log('📰 Fetching Turkey news...');
    const news = await fetchTurkeyNews();
    console.log(`Found ${news.length} news items`);

    // Step 2: Generate events via LLM
    console.log('🤖 Calling LLM to generate events...');
    const rawEvents = await generateEventsFromNews(news);
    console.log(`LLM generated ${rawEvents.length} events`);

    // Step 3: Filter duplicates
    console.log('🔍 Checking for duplicates...');
    const uniqueEvents = await checkDuplicateEvents(rawEvents);
    console.log(`${uniqueEvents.length} unique events to insert`);

    if (uniqueEvents.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No new events - all duplicates' }) };
    }

    // Step 4: Insert into Supabase
    console.log('💾 Inserting events into Supabase...');
    const rows = uniqueEvents.map(e => ({
      question: e.question,
      category: e.category || 'gundem',
      deadline: e.deadline,
      ref_links: e.sources || [],
      status: 'active',
      llm_reasoning: 'Generated from news analysis'
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(rows)
    });

    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      throw new Error(`Supabase insert error: ${insertRes.status} - ${errBody}`);
    }

    console.log(`✅ Successfully inserted ${rows.length} events`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Generated ${rows.length} new events`,
        events: rows.map(r => r.question)
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
