exports.handler = async (event, context) => {
  const { symbol } = event.queryStringParameters || {};

  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: 'symbol required' }) };
  }

  // Use api1.binance.com — works from AWS Lambda / Netlify regions
  const binanceBase = 'https://api1.binance.com/api/v3';

  try {
    const results = await Promise.all([
      fetch(`${binanceBase}/ticker/price?symbol=${symbol}`).then(r => r.json()),
      fetch(`${binanceBase}/klines?symbol=${symbol}&interval=1m&limit=10`).then(r => r.json()),
      fetch(`${binanceBase}/klines?symbol=${symbol}&interval=5m&limit=1`).then(r => r.json()),
    ]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        priceData: results[0],
        klines1m: results[1],
        klines5m: results[2],
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
