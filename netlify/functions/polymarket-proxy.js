exports.handler = async (event, context) => {
  try {
    // Fetch 300 markets to get enough diversity across categories
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?closed=false&limit=300',
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

    // ── Categorize each market ──
    function getCategory(eventTitle) {
      if (!eventTitle) return 'other';
      const t = eventTitle.toLowerCase();
      if (t.includes('world cup') || (t.includes('fifa') && (t.includes('winner') || t.includes('champion')))) return 'fifa';
      if (t.includes('nba') || t.includes('nhl') || t.includes('nfl') || t.includes('mlb') || t.includes('stanley') || t.includes('super bowl') || t.includes('finals') || (t.includes('champion') && !t.includes('president'))) return 'sports';
      if (t.includes('trump') || t.includes('election') || t.includes('president') || t.includes('ceasefire') || t.includes('congress') || t.includes('senate') || t.includes('government') || t.includes('putin') || t.includes('xi ') || t.includes('democratic') || t.includes('tariff') || t.includes('sanction')) return 'politics';
      if (t.includes('gta') || t.includes('rihanna') || t.includes('carti') || t.includes('album') || t.includes('movie') || t.includes('oscars') || t.includes('music')) return 'entertainment';
      if (t.includes('megaeth') || t.includes('bitcoin') || t.includes('$btc') || t.includes('microstrategy') || t.includes('crypto') || t.includes('defi') || t.includes('solana')) return 'crypto';
      if (t.includes('ai ') || t.includes(' space') || t.includes('nasa') || t.includes('climate') || t.includes('google') || t.includes('apple') || t.includes('tesla') || t.includes('quantum') || t.includes('science')) return 'science';
      return 'other';
    }

    // ── Group by event ──
    const events = {};
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
        events[eventKey] = { title: eventTitle, markets: [], category: getCategory(eventTitle) };
      }
      events[eventKey].markets.push(m);
    });

    // Sort each event's markets by volume
    Object.values(events).forEach(group => {
      group.markets.sort((a, b) => (b.volumeNum || 0) - (a.volumeNum || 0));
    });

    // ── Pick diverse selection: 2-3 from each event ──
    const diverse = [];

    // Strategy: ensure each category gets representation
    // Priority order: politics, sports, entertainment, fifa, crypto, science, other
    const priorityCategories = ['politics', 'sports', 'entertainment', 'fifa', 'crypto', 'science', 'other'];

    for (const cat of priorityCategories) {
      const catEvents = Object.entries(events)
        .filter(([_, g]) => g.category === cat)
        .sort((a, b) => {
          const volA = a[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
          const volB = b[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
          return volB - volA;
        });

      for (const [key, group] of catEvents) {
        // Pick 2-3 from each event
        const pickCount = Math.min(3, Math.max(2, group.markets.length));
        for (let i = 0; i < pickCount && i < group.markets.length; i++) {
          const market = { ...group.markets[i] };
          market._eventTitle = group.title;
          market._eventKey = key;
          market._category = group.category;
          diverse.push(market);
        }
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
