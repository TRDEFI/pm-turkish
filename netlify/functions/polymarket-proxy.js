exports.handler = async (event, context) => {
  try {
    // Fetch 100 markets from Gamma API (no order param - it's broken)
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

    // Filter out US-restricted markets for cleaner display
    data = data.filter(m => m.restricted !== true || m.active);

    // Sort by volume (client-side since order param is broken)
    data.sort((a, b) => (b.volumeNum || 0) - (a.volumeNum || 0));

    // ── Diversify: pick top 2-3 from each event ──
    const events = {};
    data.forEach(m => {
      // Use event slug as group key; fallback to 'genel' if missing
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
    });

    // Pick 2-3 from each event group
    const diverse = [];
    const eventEntries = Object.entries(events);

    // Sort events by total volume (most interesting first)
    eventEntries.sort((a, b) => {
      const volA = a[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
      const volB = b[1].markets.reduce((s, m) => s + (m.volumeNum || 0), 0);
      return volB - volA;
    });

    for (const [key, group] of eventEntries) {
      const pickCount = Math.min(3, Math.max(2, group.markets.length));
      for (let i = 0; i < pickCount && i < group.markets.length; i++) {
        const market = { ...group.markets[i] };
        market._eventTitle = group.title;
        market._eventKey = key;
        diverse.push(market);
      }
    }

    // Cap at 24 total (6 categories x 4 = nice grid)
    const result = diverse.slice(0, 24);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
