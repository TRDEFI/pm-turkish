exports.handler = async (event, context) => {
  try {
    // Fetch 100 markets from Gamma API (no filter, client-side categorizes)
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?closed=false&limit=100',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!res.ok) {
      throw new Error(`Gamma API responded with ${res.status}`);
    }

    let data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify([]),
      };
    }

    // Sort by volume (order param is broken on API)
    data.sort((a, b) => (b.volumeNum || 0) - (a.volumeNum || 0));

    // ── Group markets by event ──
    const events = {};
    const catMap = [];

    data.forEach(m => {
      const evt = m.events;
      let eventKey = 'genel';
      let eventTitle = 'Genel';

      if (evt) {
        if (Array.isArray(evt) && evt.length > 0) {
          eventKey = evt[0].slug || evt[0].id || 'genel';
          eventTitle = evt[0].title || eventKey;
        } else if (evt.slug) {
          eventKey = evt.slug;
          eventTitle = evt.title || eventKey;
        }
      }

      if (!events[eventKey]) {
        events[eventKey] = { title: eventTitle, markets: [] };
      }
      events[eventKey].markets.push(m);

      // Categorize based on event title (client-side will use this)
      const titleLower = eventTitle.toLowerCase();
      let category = 'all';
      if (
        titleLower.includes('world cup') ||
        titleLower.includes('fifa ') ||
        titleLower.includes('fifa,') ||
        titleLower.includes('football') ||
        titleLower.includes('soccer')
      ) {
        category = 'fifa';
      } else if (
        titleLower.includes('nba') ||
        titleLower.includes('nhl') ||
        titleLower.includes('nfl') ||
        titleLower.includes('mlb') ||
        titleLower.includes('stanley') ||
        titleLower.includes('super bowl') ||
        titleLower.includes('finals') ||
        titleLower.includes('champion')
      ) {
        category = 'sports';
      } else if (
        titleLower.includes('trump') ||
        titleLower.includes('election') ||
        titleLower.includes('president') ||
        titleLower.includes('ceasefire') ||
        titleLower.includes('congress') ||
        titleLower.includes('senate') ||
        titleLower.includes('government') ||
        titleLower.includes('war') ||
        titleLower.includes('israel') ||
        titleLower.includes('ukraine') ||
        titleLower.includes('russia') ||
        titleLower.includes('china') ||
        titleLower.includes('tariffs')
      ) {
        category = 'politics';
      } else if (
        titleLower.includes('gta') ||
        titleLower.includes('rihanna') ||
        titleLower.includes('album') ||
        titleLower.includes('movie') ||
        titleLower.includes('movie') ||
        titleLower.includes('oscars') ||
        titleLower.includes('carti') ||
        titleLower.includes('music')
      ) {
        category = 'entertainment';
      } else if (
        titleLower.includes('megaeth') ||
        titleLower.includes('bitcoin') ||
        titleLower.includes('$btc') ||
        titleLower.includes('microstrategy') ||
        titleLower.includes('crypto') ||
        titleLower.includes('eth') ||
        titleLower.includes('ethereum') ||
        titleLower.includes('token') ||
        titleLower.includes('defi')
      ) {
        category = 'crypto';
      } else if (
        titleLower.includes('ai') ||
        titleLower.includes('science') ||
        titleLower.includes('space') ||
        titleLower.includes('nasa') ||
        titleLower.includes('covid') ||
        titleLower.includes('health') ||
        titleLower.includes('tech') ||
        titleLower.includes('apple')
      ) {
        category = 'science';
      }

      catMap.push({ eventKey, category, eventTitle });
    });

    // Tag each market with its category
    const categorized = data.map((m, i) => {
      const cm = catMap[i];
      return { ...m, _category: cm ? cm.category : 'all' };
    });

    // Pick 2-3 from each event group, preserving order
    const diverse = [];
    const eventEntries = Object.entries(events);
    
    // Sort events by total volume
    eventEntries.sort((a, b) => {
      const volA = a[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
      const volB = b[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
      return volB - volA;
    });

    for (const [key, group] of eventEntries) {
      const pickCount = Math.min(3, Math.max(2, group.markets.length));
      for (let i = 0; i < pickCount && i < group.markets.length; i++) {
        const market = { ...group.markets[i] };
        const cm = catMap.find(c => c.eventKey === key);
        market._eventTitle = group.title;
        market._eventKey = key;
        market._category = cm ? cm.category : 'all';
        diverse.push(market);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(diverse),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
