exports.handler = async (event, context) => {
  const { symbol } = event.queryStringParameters || {};

  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: 'symbol required' }) };
  }

  // Bybit has no geo-restrictions, works from AWS Lambda/Netlify
  const bybitBase = 'https://api.bybit.com/v5/market';

  try {
    // Fetch price
    const priceResp = await fetch(`${bybitBase}/tickers?category=spot&symbol=${symbol}`);
    const priceData = await priceResp.json();

    if (priceData.retCode !== 0 || !priceData.result?.list?.[0]) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Bybit price fetch failed' }) };
    }

    const ticker = priceData.result.list[0];
    const currentPrice = ticker.lastPrice;

    // Fetch 1m klines (last 10 candles)
    const klines1mResp = await fetch(
      `${bybitBase}/kline?category=spot&symbol=${symbol}&interval=1&limit=10`
    );
    const klines1mData = await klines1mResp.json();

    // Bybit format: [time, open, high, low, close, volume, turnover]
    const klines1m = (klines1mData.result?.list || []).reverse().map(k => [
      parseInt(k[0]),
      k[1], // open
      k[2], // high
      k[3], // low
      k[4], // close
      k[5], // volume
    ]);

    // Fetch 5m kline for ref price
    const klines5mResp = await fetch(
      `${bybitBase}/kline?category=spot&symbol=${symbol}&interval=5&limit=1`
    );
    const klines5mData = await klines5mResp.json();
    const klines5m = (klines5mData.result?.list || []).map(k => [
      parseInt(k[0]),
      k[1], k[2], k[3], k[4], k[5],
    ]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        priceData: { symbol, price: currentPrice },
        klines1m,
        klines5m,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
