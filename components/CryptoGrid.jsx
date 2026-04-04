'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const COINS = [
  { symbol: 'BTCUSDT', short: 'BTC', name: 'Bitcoin', decimals: 2, accent: '#f7931a', symbolChar: '₿' },
  { symbol: 'ETHUSDT', short: 'ETH', name: 'Ethereum', decimals: 2, accent: '#627eea', symbolChar: 'Ξ' },
  { symbol: 'XRPUSDT', short: 'XRP', name: 'Ripple', decimals: 4, accent: '#00aae4', symbolChar: '✕' },
];

const GREEN = '#22c55e';
const RED = '#ef4444';

function secondsRemaining() {
  return 300 - (Math.floor(Date.now() / 1000) % 300);
}

/* ─── Chart ─── */
function MiniChart({ candles, chartH = 180, refPrice, accent }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles?.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const W = rect.width;
    const H = chartH;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const closes = candles.map(c => +c[4]);
    const times = candles.map(c => +c[0]);
    if (closes.length < 2) return;

    const lastClose = closes[closes.length - 1];
    const rawMin = Math.min(...closes);
    const rawMax = Math.max(...closes);
    const rawRange = rawMax - rawMin;
    // Force minimum 2% Y-axis range (0.02) so XRP ($1.31) price movement is visible
    const minRange = Math.max(rawRange, Math.abs(lastClose) * 0.02);
    const halfRange = minRange / 2;
    const pady = Math.max(halfRange * 0.4, Math.abs(lastClose) * 0.002);
    const centerY = (rawMin + rawMax) / 2;
    const yMin = centerY - halfRange - pady;
    const yMax = centerY + halfRange + pady;
    const yRange = yMax - yMin;

    const ml = 8, mr = 64, mt = 10, mb = 24;
    const cW = W - ml - mr;
    const cH = H - mt - mb;

    const toX = i => ml + (cW / (closes.length - 1)) * i;
    const toY = p => mt + cH * (1 - (p - yMin) / yRange);

    // Background
    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, 0, W, H);

    // Grid + Y labels
    const gridN = 5;
    ctx.font = '10px -apple-system, sans-serif';
    for (let i = 0; i <= gridN; i++) {
      const val = yMin + (yRange * i) / gridN;
      const gy = toY(val);
      ctx.strokeStyle = '#1e2329';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ml, gy); ctx.lineTo(W - mr, gy); ctx.stroke();

      const dec = Math.abs(lastClose) > 1000 ? 2 : 4;
      ctx.fillStyle = '#848e9c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`$${val.toFixed(dec)}`, W - mr + 5, gy);
    }

    // X-axis: time labels
    for (let i = 0; i < closes.length; i += Math.max(1, Math.floor(closes.length / 5))) {
      const gx = toX(i);
      ctx.strokeStyle = '#141820';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, mt); ctx.lineTo(gx, mt + cH); ctx.stroke();

      const d = new Date(times[i]);
      ctx.fillStyle = '#848e9c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`, gx, H - mb + 6);
    }

    // REF line
    if (refPrice > 0) {
      const ry = toY(refPrice);
      if (ry >= mt && ry <= mt + cH) {
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ml, ry); ctx.lineTo(W - mr, ry); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#2962ff';
        ctx.font = 'bold 9px -apple-system';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`REF`, ml + 4, ry - 2);
      }
    }

    // Price line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      const cp = (toX(i-1) + toX(i)) / 2;
      ctx.bezierCurveTo(cp, toY(closes[i-1]), cp, toY(closes[i]), toX(i), toY(closes[i]));
    }
    ctx.stroke();

    // Fill
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      const cp = (toX(i-1) + toX(i)) / 2;
      ctx.bezierCurveTo(cp, toY(closes[i-1]), cp, toY(closes[i]), toX(i), toY(closes[i]));
    }
    ctx.lineTo(toX(closes.length-1), mt + cH);
    ctx.lineTo(toX(0), mt + cH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, mt, 0, mt + cH);
    grad.addColorStop(0, accent + '18');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Dot
    const lp = closes[closes.length-1];
    const lx = toX(closes.length-1);
    const ly = toY(lp);
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI*2);
    ctx.fillStyle = accent+'30'; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI*2);
    ctx.fillStyle = accent; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

  }, [candles, chartH, refPrice, accent]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: chartH + 'px' }} />;
}

/* ─── Card ─── */
function CryptoCard({ coin, data, countdown, flash }) {
  if (!data?.currentPrice) {
    return (
      <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 h-64 sm:h-72 animate-pulse" />
    );
  }

  const dec = coin.decimals;
  const price = +data.currentPrice;
  const chg = +(data.priceChangePct || 0);
  const chgUp = chg >= 0;
  const refP = data.refPrice ? +data.refPrice : price;
  const diff = price - refP;
  const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(dec)}`;
  const diffColor = diff >= 0 ? GREEN : RED;
  const diffPct = refP > 0 ? (diff / refP) * 100 : 0;
  const yes = Math.min(Math.max(Math.round(50 + diffPct * 500), 5), 95);
  const no = 100 - yes;
  const priceStr = price.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <div className="rounded-xl border border-slate-700/40 bg-[#0b0e11] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e2329]">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: coin.accent }} className="text-lg font-bold shrink-0">{coin.symbolChar}</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#eaecef] truncate">{coin.name}</div>
            <div className="text-[9px] text-[#5e6673]">{coin.short}/USDT</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${chgUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {chgUp ? '+' : ''}{chg.toFixed(3)}%
          </span>
          <div className="text-sm font-mono font-bold" style={{ color: flash || (chgUp ? GREEN : RED) }}>
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="px-3 py-1.5">
        <div className="text-base sm:text-lg font-bold" style={{ color: flash || '#eaecef' }}>${priceStr}</div>
        <div className="text-[9px] font-mono" style={{ color: diffColor }}>
          Ref: ${refP.toFixed(dec)} ({diffStr})
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 py-0.5 flex-1 min-h-0">
        <MiniChart candles={data.candle1m?.slice(-10) || []} chartH={180} refPrice={refP} accent={coin.accent} />
      </div>

      {/* YUKARI / ASAGI */}
      <div className="grid grid-cols-2 gap-1 px-3 pb-2.5 pt-1">
        <div className="rounded bg-green-600/90 py-1 px-1.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-400/10" style={{ width: `${yes}%` }} />
          <div className="relative z-10">
            <div className="text-[7px] text-green-200/80">YUKARI</div>
            <div className="text-xs font-bold text-white">{yes}%</div>
          </div>
        </div>
        <div className="rounded bg-red-600/90 py-1 px-1.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-400/10" style={{ width: `${no}%` }} />
          <div className="relative z-10">
            <div className="text-[7px] text-red-200/80">ASAGI</div>
            <div className="text-xs font-bold text-white">{no}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Grid ─── */
export default function CryptoGrid() {
  const [allData, setAllData] = useState({});
  const [cd, setCd] = useState(secondsRemaining());
  const prevRef = useRef({});
  const [flash, setFlash] = useState({});

  const pull = useCallback(async () => {
    try {
      const results = await Promise.all(
        COINS.map(async (coin) => {
          try {
            const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${coin.symbol}`);
            if (!res.ok) return { short: coin.short, error: 'API error' };

            const data = await res.json();
            if (data.error) return { short: coin.short, error: data.error };

            const priceData = data.priceData;
            const klines1m = data.klines1m;
            const klines5m = data.klines5m;
            const currentPrice = parseFloat(priceData.price);

            const firstOpen = parseFloat(klines1m?.[0]?.[1] || currentPrice);
            const priceChangePct = firstOpen > 0 ? ((currentPrice - firstOpen) / firstOpen) * 100 : 0;

            let refPrice = null;
            if (klines5m?.length > 0) refPrice = parseFloat(klines5m[klines5m.length - 1][1]);

            return {
              short: coin.short,
              currentPrice,
              priceChangePct,
              candle1m: klines1m,
              refPrice,
            };
          } catch (e) {
            return { short: coin.short, error: e.message };
          }
        })
      );

      const nd = {}, nf = {};
      results.forEach(c => {
        if (c.error || !c.short) return;
        const s = c.short;
        const np = +c.currentPrice;
        const prev = prevRef.current[s];
        if (prev != null && np !== prev) nf[s] = np > prev ? GREEN : RED;
        prevRef.current[s] = np;
        nd[s] = c;
      });
      setAllData(d => ({ ...d, ...nd }));
      if (Object.keys(nf).length) {
        setFlash(nf);
        setTimeout(() => setFlash({}), 600);
      }
    } catch (e) { console.error('[Crypto]', e); }
  }, []);

  useEffect(() => { pull(); const i = setInterval(pull, 3000); return () => clearInterval(i); }, [pull]);
  useEffect(() => { setCd(secondsRemaining()); const i = setInterval(() => setCd(secondsRemaining()), 1000); return () => clearInterval(i); }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-slate-300">Canlı Kripto 5-Dakika Yön Tahmini</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {COINS.map(c => (
          <CryptoCard key={c.short} coin={c} data={allData[c.short]} countdown={cd} flash={flash[c.short] || null} />
        ))}
      </div>

      <div className="mt-2 text-center text-[9px] text-slate-600">
        Binance • 3 saniye güncelleme • Netlify Functions proxy
      </div>
    </div>
  );
}
