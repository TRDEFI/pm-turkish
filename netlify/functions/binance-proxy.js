exports.handler = async (event, context) => {
  const { symbol } = event.queryStringParameters || {};

  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: 'symbol required' }) };
  }

  // Gate.io uses underscore pairs (BTC_USDT) — no geo-restrictions from AWS Lambda
  const gateSymbol = symbol.replace('USDT', '_USDT');
  const gateBase = 'https://api.gateio.ws/api/v4/spot';

  try {
    // 1) Price ticker
    const priceResp = await fetch(`${gateBase}/tickers?currency_pair=${gateSymbol}`);
    if (!priceResp.ok) {
      return { statusCode: priceResp.status, body: JSON.stringify({ error: `Gate price failed: ${priceResp.status}` }) };
    }
    const tickers = await priceResp.json();
    if (!tickers || !tickers[0]) {
      return { statusCode: 500, body: JSON.stringify({ error: `No ticker data for ${gateSymbol}` }) };
    }
    const currentPrice = tickers[0].last;

    // 2) 1m klines (last 10)
    const klines1mResp = await fetch(`${gateBase}/candlesticks?currency_pair=${gateSymbol}&interval=1m&limit=10`);
    const klines1mRaw = await klines1mResp.json();
    // Gate format: [timestamp, quote_volume, close, high, low, open, base_volume]
    // Binance format:  [time_ms, open, high, low, close, volume]
    const klines1m = (klines1mRaw || []).map(k => [
      parseInt(k[0]) * 1000,  // timestamp → ms
      k[5],   // open
      k[3],   // high
      k[4],   // low
      k[2],   // close
      k[6],   // volume
    ]);

    // 3) 5m kline for ref price
    const klines5mResp = await fetch(`${gateBase}/candlesticks?currency_pair=${gateSymbol}&interval=5m&limit=1`);
    const klines5mRaw = await klines5mResp.json();
    const klines5m = (klines5mRaw || []).map(k => [
      parseInt(k[0]) * 1000, k[5], k[3], k[4], k[2], k[6]
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
