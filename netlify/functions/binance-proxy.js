const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { symbol, endpoint } = event.queryStringParameters || {};

  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: 'symbol required' }) };
  }

  const binanceBase = 'https://api.binance.com/api/v3';

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
