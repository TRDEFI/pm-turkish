/**
 * BTC 5-Minute Prediction Engine
 * Analyzes Binance candle data to produce probability signals
 */

function calculateRSI(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return 50;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  var avgGain = gains / period;
  var avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  var rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(data, period) {
  var k = 2 / (period + 1);
  var ema = data[0];
  for (var i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function generateSignal(candles) {
  if (!candles || candles.length < 5) return null;

  var closes = candles.map(function(c) { return parseFloat(c[4]); });
  var volumes = candles.map(function(c) { return parseFloat(c[5]); });
  var highs = candles.map(function(c) { return parseFloat(c[2]); });
  var lows = candles.map(function(c) { return parseFloat(c[3]); });

  var currentPrice = closes[closes.length - 1];
  var prevPrice = closes[closes.length - 2];

  // 1. Momentum
  var shortMomentum = currentPrice - closes[Math.max(0, closes.length - 4)];
  var momentumPct = (shortMomentum / currentPrice) * 100;
  var momentumScore = Math.min(Math.max(momentumPct * 20, -50), 50);

  // 2. Trend (EMA crossover)
  var trendScore = 0;
  if (closes.length >= 20) {
    var ema5 = calculateEMA(closes.slice(-20), 5);
    var ema10 = calculateEMA(closes.slice(-20), 10);
    trendScore = ema5 > ema10 ? 25 : -25;
    var diff = Math.abs(ema5 - ema10) / currentPrice * 1000;
    trendScore *= Math.min(diff, 1);
  } else if (closes.length >= 10) {
    var ema5s = calculateEMA(closes, 5);
    var simpleAvg = closes.reduce(function(a, b) { return a + b; }, 0) / closes.length;
    trendScore = ema5s > simpleAvg ? 15 : -15;
  }

  // 3. RSI
  var rsi = calculateRSI(closes);
  var rsiSignal = 0;
  if (rsi > 70) rsiSignal = -20;
  else if (rsi > 60) rsiSignal = -10;
  else if (rsi < 30) rsiSignal = 20;
  else if (rsi < 40) rsiSignal = 10;

  // 4. Volume
  var volumeScore = 0;
  if (volumes.length >= 5) {
    var avgVol = volumes.slice(0, -1).reduce(function(a, b) { return a + b; }, 0) / (volumes.length - 1);
    var lastVol = volumes[volumes.length - 1];
    var volRatio = avgVol > 0 ? lastVol / avgVol : 1;
    if (volRatio > 2 && momentumPct > 0) volumeScore = 15;
    else if (volRatio > 2 && momentumPct < 0) volumeScore = -15;
    else if (volRatio > 1.5 && momentumPct > 0) volumeScore = 8;
    else if (volRatio > 1.5 && momentumPct < 0) volumeScore = -8;
  }

  // 5. Volatility
  var volPenalty = 0;
  if (closes.length >= 5) {
    var ranges = [];
    for (var j = Math.max(0, closes.length - 5); j < closes.length; j++) {
      ranges.push((highs[j] - lows[j]) / currentPrice * 100);
    }
    var avgRange = ranges.reduce(function(a, b) { return a + b; }, 0) / ranges.length;
    if (avgRange > 0.5) volPenalty = -10;
    else if (avgRange < 0.1) volPenalty = 5;
  }

  var rawScore = momentumScore + trendScore + rsiSignal + volumeScore + volPenalty;
  var probability = Math.min(Math.max(50 + rawScore, 5), 95);
  var confidence = Math.abs(rawScore);
  var confLabel = confidence > 30 ? 'Yuksek' : confidence > 15 ? 'Orta' : 'Dusuk';

  return {
    currentPrice: currentPrice,
    prevPrice: prevPrice,
    priceChange: currentPrice - prevPrice,
    priceChangePct: ((currentPrice - prevPrice) / prevPrice * 100).toFixed(3),
    rsi: Math.round(rsi * 10) / 10,
    momentumPct: momentumPct.toFixed(3),
    volumeScore: Math.round(volumeScore),
    probability: probability,
    confidence: confLabel,
    direction: probability > 50 ? 'up' : 'down',
    rawData: {
      momentumScore: Math.round(momentumScore),
      trendScore: Math.round(trendScore),
      rsiSignal: rsiSignal,
      volatilityPenalty: volPenalty
    }
  };
}

export function generateThresholds(price) {
  var p = parseFloat(price);
  var rounded = Math.round(p / 100) * 100;
  return {
    upper: [rounded + 100, rounded + 200, rounded + 500],
    lower: [rounded - 100, rounded - 200, rounded - 500],
    display: {
      upper1: '$' + (rounded + 100).toLocaleString(),
      upper2: '$' + (rounded + 200).toLocaleString(),
      upper3: '$' + (rounded + 500).toLocaleString(),
      lower1: '$' + (rounded - 100).toLocaleString(),
      lower2: '$' + (rounded - 200).toLocaleString(),
      lower3: '$' + (rounded - 500).toLocaleString()
    }
  };
}
