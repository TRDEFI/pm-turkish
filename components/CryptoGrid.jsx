'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const COINS = [
  { symbol: 'BTCUSDT', short: 'BTC', name: 'Bitcoin', decimals: 2, accent: '#f7931a', symbolChar: '₿', yRange: 100 },
  { symbol: 'ETHUSDT', short: 'ETH', name: 'Ethereum', decimals: 2, accent: '#627eea', symbolChar: 'Ξ', yRange: 50 },
  { symbol: 'XRPUSDT', short: 'XRP', name: 'Ripple', decimals: 4, accent: '#00aae4', symbolChar: '✕', yRange: 0.005 },
];

const GREEN = '#22c55e';
const RED = '#ef4444';

function secondsRemaining() {
  return 300 - (Math.floor(Date.now() / 1000) % 300);
}

/* ─── Chart ─── */
function MiniChart({ candles, chartH = 180, refPrice, accent, coinYRange }) {
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
    // Fixed Y-axis range per coin: BTC=±$100, ETH=±$50, XRP=±$0.005
    const halfRange = (coinYRange || Math.abs(lastClose) * 0.02) / 2;
    const centerY = (rawMin + rawMax) / 2;
    const pady = halfRange * 0.3;
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

  }, [candles, chartH, refPrice, accent, coinYRange]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: chartH + 'px' }} />;
}

/* ─── Trade Modal ─── */
function TradeModal({ coin, direction, price, onClose }) {
  const [amount, setAmount] = useState('');
  const overlayRef = useRef(null);

  const total = amount ? (parseFloat(amount) * price).toFixed(2) : '—';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#1a1d28] rounded-2xl border border-slate-700/50 w-[380px] max-w-[95vw] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: coin.accent }}>
              {coin.symbolChar}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{coin.name}</div>
              <div className="text-[10px] text-slate-500">{coin.short}/USDT</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>

        {/* Direction Badge */}
        <div className="px-5 pt-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            direction === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {direction === 'up' ? '▲ YUKARI' : '▼ ASAGI'}
          </div>
        </div>

        {/* Price Info */}
        <div className="px-5 pt-3 pb-4">
          <div className="text-xl font-bold text-white">${price.toLocaleString('en-US', { minimumFractionDigits: coin.decimals, maximumFractionDigits: coin.decimals })}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Canlı piyasa fiyatı</div>
        </div>

        {/* Currency Selector */}
        <div className="px-5 pb-3">
          <label className="text-xs text-slate-400 mb-1.5 block">Ödeme Yöntemi</label>
          <div className="flex gap-2">
            {[
              { name: 'USDT', icon: '₮', bg: '#26a17b' },
              { name: 'USDC', icon: '$', bg: '#2775ca' },
              { name: 'DAI', icon: '◈', bg: '#f5af31' },
            ].map((c, i) => (
              <div
                key={c.name}
                className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  i === 0 ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700/50 bg-slate-800/50'
                }`}
              >
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: c.bg }}>
                  {c.icon}
                </div>
                <span className="text-xs font-medium text-slate-300">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="px-5 pb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Miktar Girin (USD)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">USD</span>
          </div>
        </div>

        {/* Estimated Total */}
        {amount && parseFloat(amount) > 0 && (
          <div className="mx-5 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tahmini Değer</span>
              <span className="text-white font-bold">${total}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-700/50 text-slate-400 text-sm font-medium hover:bg-slate-800/50 transition-colors"
          >
            İptal
          </button>
          <button
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: direction === 'up'
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
            }}
          >
            {direction === 'up' ? '🟢 Almayı İncele' : '🔴 Satmayı İncele'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card ─── */
function CryptoCard({ coin, data, countdown, flash }) {
  const [modal, setModal] = useState(null); // { direction: 'up'|'down' }

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
    <>
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
        <MiniChart candles={data.candle1m?.slice(-10) || []} chartH={180} refPrice={refP} accent={coin.accent} coinYRange={coin.yRange} />
      </div>

      {/* YUKARI / ASAGI */}
      <div className="grid grid-cols-2 gap-1 px-3 pb-2.5 pt-1">
        <div
          className="rounded bg-green-600/90 py-1 px-1.5 text-center relative overflow-hidden cursor-pointer hover:bg-green-500/90 transition-colors active:scale-95"
          onClick={() => setModal({ direction: 'up' })}
        >
          <div className="absolute inset-0 bg-green-400/10" style={{ width: `${yes}%` }} />
          <div className="relative z-10">
            <div className="text-[7px] text-green-200/80">YUKARI</div>
            <div className="text-xs font-bold text-white">{yes}%</div>
          </div>
        </div>
        <div
          className="rounded bg-red-600/90 py-1 px-1.5 text-center relative overflow-hidden cursor-pointer hover:bg-red-500/90 transition-colors active:scale-95"
          onClick={() => setModal({ direction: 'down' })}
        >
          <div className="absolute inset-0 bg-red-400/10" style={{ width: `${no}%` }} />
          <div className="relative z-10">
            <div className="text-[7px] text-red-200/80">ASAGI</div>
            <div className="text-xs font-bold text-white">{no}%</div>
          </div>
        </div>
      </div>
    </div>

    {modal && (
      <TradeModal
        coin={coin}
        direction={modal.direction}
        price={price}
        onClose={() => setModal(null)}
      />
    )}
    </>
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
        Gate.io • 3 saniye güncelleme • Netlify Functions proxy
      </div>
    </div>
  );
}
