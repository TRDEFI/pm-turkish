exports.handler = async (event, context) => {
  const { symbol } = event.queryStringParameters || {};

  if (!symbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'symbol required' })
    };
  }

  const bybitBase = 'https://api.bybit.com/v5/market';

  try {
    // Fetch price
    const priceResp = await fetch(`${bybitBase}/tickers?category=spot&symbol=${symbol}`);
    if (!priceResp.ok) {
      return {
        statusCode: priceResp.status,
        body: JSON.stringify({ error: `Price request failed: ${priceResp.status}` })
      };
    }
    const priceData = await priceResp.json();

    if (priceData.retCode !== 0 || !priceData.result?.list?.[0]) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Bybit error: ${JSON.stringify(priceData)}` })
      };
    }

    const ticker = priceData.result.list[0];
    const currentPrice = ticker.lastPrice;

    // Fetch 1m klines
    const klines1mResp = await fetch(`${bybitBase}/kline?category=spot&symbol=${symbol}&interval=1&limit=10`);
    const klines1mData = await klines1mResp.json();
    const klines1m = (klines1mData.result?.list || []).reverse().map(k => [
      parseInt(k[0]), k[1], k[2], k[3], k[4], k[5]
    ]);

    // Fetch 5m kline
    const klines5mResp = await fetch(`${bybitBase}/kline?category=spot&symbol=${symbol}&interval=5&limit=1`);
    const klines5mData = await klines5mResp.json();
    const klines5m = (klines5mData.result?.list || []).map(k => [
      parseInt(k[0]), k[1], k[2], k[3], k[4], k[5]
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
      body: JSON.stringify({
        error: err.message,
        symbol,
      }),
    };
  }
};
