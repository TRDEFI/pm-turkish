'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CHART_BG = '#0f1923';
const GRID_COLOR = '#1e2d3d';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';

function getSecondsRemaining() {
  const now = Math.floor(Date.now() / 1000);
  return 300 - (now % 300);
}

function getCurrentCycleId() {
  return Math.floor(Date.now() / 300000);
}

export default function BTC5MinSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(getSecondsRemaining());
  const [cycleRefPrice, setCycleRefPrice] = useState(null);

  const prevPriceRef = useRef(null);
  const [priceUp, setPriceUp] = useState(null);
  const currentCycleIdRef = useRef(getCurrentCycleId());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/btc');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const newPrice = parseFloat(json.currentPrice);

      // Price flash
      if (prevPriceRef.current !== null) {
        setPriceUp(newPrice > prevPriceRef.current);
        setTimeout(() => setPriceUp(null), 800);
      }
      prevPriceRef.current = newPrice;

      // Cycle kontrolu — her 5 dk'da yeni REF fiyat al
      const cycleId = getCurrentCycleId();
      if (cycleId !== currentCycleIdRef.current) {
        currentCycleIdRef.current = cycleId;
        setCycleRefPrice(newPrice);
      }

      setData(json);
    } catch (err) {
      console.error('[BTC]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, 1000);
    return () => clearInterval(t);
  }, [fetchData]);
  useEffect(() => {
    const tick = () => setCountdown(getSecondsRemaining());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Ilk yukleme: REF henuz yoksa en son 5dk mumunun OPEN fiyatini kullan
  useEffect(() => {
    if (cycleRefPrice === null && data && data.candle5m && data.candle5m.length > 0) {
      const latest5m = data.candle5m[data.candle5m.length - 1];
      const openStr = latest5m[1];
      const parsed = parseFloat(openStr);
      if (parsed > 0) {
        setCycleRefPrice(parsed);
      }
    }
  }, [data, cycleRefPrice]);

  if (loading) return <Loading />;
  if (!data || !data.candle1m || data.candle1m.length === 0) {
    return (
      <div className="mb-8 text-center py-8">
        <p className="text-slate-400 text-sm">BTC verileri yukleniyor...</p>
      </div>
    );
  }

  const price = parseFloat(data.currentPrice);
  const priceStr = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const changePct = parseFloat(data.priceChangePct);

  // Zaman etiketi
  const now = new Date();
  const cycleEnd = new Date(now.getTime() + getSecondsRemaining() * 1000);
  const ft = (d) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  const timeLabel = `${ft(now)} - ${ft(cycleEnd)}`;

  const refPrice = cycleRefPrice || price;
  const refDiff = price - refPrice;
  const refDiffStr = `${refDiff >= 0 ? '+' : ''}$${Math.abs(refDiff).toFixed(2)}`;
  const refDiffColor = refDiff >= 0 ? '#22c55e' : '#ef4444';

  const diffPct = refPrice > 0 ? (refDiff / refPrice) * 100 : 0;
  const yesProb = Math.min(Math.max(Math.round(50 + diffPct * 500), 5), 95);
  const noProb = 100 - yesProb;

  const thresholds = [
    { label: `REF + $100`, price: refPrice + 100, type: 'above' },
    { label: `REF + $50`, price: refPrice + 50, type: 'above' },
    { label: `REF - $50`, price: refPrice - 50, type: 'below' },
    { label: `REF - $100`, price: refPrice - 100, type: 'below' },
  ];

  return (
    <div className="mb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">&#x20bf;</span>
          <h2 className="text-sm font-semibold text-slate-300">
            BTC 5 Dakika Yon Tahmini
          </h2>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {timeLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-base font-mono font-bold text-orange-400">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${changePct >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {changePct >= 0 ? '+' : ''}{changePct}%
          </span>
        </div>
      </div>

      {/* Price + REF diff */}
      <div className="mb-3 flex items-baseline gap-3">
        <span
          className="text-2xl font-bold transition-colors duration-500"
          style={{ color: priceUp === true ? GREEN : priceUp === false ? '#ef4444' : '#ffffff' }}
        >
          ${priceStr}
        </span>
        <span className="text-xs font-mono" style={{ color: refDiffColor }}>
          REF: ${refPrice.toFixed(2)} ({refDiffStr})
        </span>
      </div>

      {/* Chart */}
      <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/40 mb-4">
        <div style={{ height: '160px' }}>
          <LineChart
            candles={data.candle1m.slice(-10)}
            height={160}
            referencePrice={refPrice}
          />
        </div>
      </div>

      {/* YUKARI / ASAGI */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-green-600/90 py-2 px-2.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-400/10" style={{ width: `${yesProb}%` }} />
          <div className="relative z-10">
            <div className="text-[9px] text-green-200/80 font-medium mb-0.5">YUKARI</div>
            <div className="text-lg font-bold text-white">{yesProb}%</div>
          </div>
        </div>

        <div className="rounded-lg bg-red-600/90 py-2 px-2.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-400/10" style={{ width: `${noProb}%` }} />
          <div className="relative z-10">
            <div className="text-[9px] text-red-200/80 font-medium mb-0.5">ASAGI</div>
            <div className="text-lg font-bold text-white">{noProb}%</div>
          </div>
        </div>
      </div>

      {/* Extra thresholds */}
      <div className="grid grid-cols-4 gap-2">
        {thresholds.map((t, idx) => {
          const dist = price - t.price;
          const isHit = (t.type === 'above' && dist > 0) || (t.type === 'below' && dist < 0);
          const prob = t.type === 'above'
            ? Math.min(Math.max(Math.round(50 + ((dist / refPrice) * 500)), 5), 95)
            : Math.min(Math.max(Math.round(50 + ((-dist / refPrice) * 500)), 5), 95);

          return (
            <div key={idx} className={`rounded-lg px-1.5 py-1.5 text-center ${isHit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <div className="text-[8px] opacity-70 truncate">{t.label}</div>
              <div className="text-sm font-bold">{prob}%</div>
              <div className="text-[8px] opacity-60">{isHit ? 'YUKARI' : 'ASAGI'}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-center text-[9px] text-slate-600">
        Binance • teknik analiz &bull; yatirim tavsiyesi degildir
      </div>
    </div>
  );
}

/* ============================================================
   Line Chart
   ============================================================ */
function LineChart({ candles, height = 160, referencePrice }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      drawChart(ctx, rect.width, height, candles, referencePrice);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [candles, height, referencePrice]);

  return <canvas ref={canvasRef} className="w-full block" style={{ height: `${height}px` }} />;
}

function drawChart(ctx, width, height, candles, referencePrice) {
  const closes = candles.map(c => parseFloat(c[4]));
  const times = candles.map(c => c[0]);

  if (closes.length === 0) return;

  const rawMin = Math.min(...closes);
  const rawMax = Math.max(...closes);
  const rawRange = rawMax - rawMin || 1;

  // Sıkı zoom: mumların aralığına göre dinamik ama maksimum $30
  // Min $3 buffer ki grafik nefes alsın ve desimal bounce görünsün
  let padding = Math.max(rawRange * 0.4, 3);
  if (padding > 15) padding = 15;
  if (padding > 30) padding = 30;

  const mid = (rawMin + rawMax) / 2;
  let min = mid - padding;
  let max = mid + padding;
  const range = max - min;

  // REF fiyatı visible range'de mi? Değilse ok göster
  const refInRange = referencePrice > 0 && referencePrice >= min && referencePrice <= max;

  const pad = { top: 12, bottom: 20, left: 4, right: 55 };
  const ch = height - pad.top - pad.bottom;
  const cw = width - pad.left - pad.right;

  const toY = p => pad.top + ch - ((p - min) / range) * ch;
  const toX = i => pad.left + (cw / (closes.length - 1 || 1)) * i;

  // Background
  ctx.fillStyle = CHART_BG;
  ctx.fillRect(0, 0, width, height);

  // Grid — 5 yatay çizgi, hep 2 decimal tr formatı
  const gridSteps = 5;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  for (let i = 0; i <= gridSteps; i++) {
    const y = pad.top + (ch / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();

    const priceAtY = max - ((ch / gridSteps) * i / ch) * range;
    ctx.fillStyle = '#4a5568';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    // Hep 2 decimal, tr formatı: 67.200,28 → virgül decimal ayırıcı
    const formatted = priceAtY.toFixed(2).replace('.', ',');
    ctx.fillText(`$${formatted}`, width - pad.right + 4, y + 3);
  }
  ctx.setLineDash([]);

  // REF line — visible range içindeyse yeşil kesikli çizgi
  if (referencePrice > 0) {
    const refY = toY(referencePrice);
    if (refInRange) {
      ctx.strokeStyle = 'rgba(74,222,128,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, refY);
      ctx.lineTo(width - pad.right, refY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(74,222,128,0.9)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      const refFormatted = referencePrice.toFixed(2).replace('.', ',');
      ctx.fillText(`REF $${refFormatted}`, pad.left + 4, refY - 6);
    } else {
      // REF range dışında → ok ile göster
      const isAbove = referencePrice > max;
      const arrowY = isAbove ? pad.top + 4 : pad.top + ch - 4;
      ctx.fillStyle = 'rgba(74,222,128,0.8)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      const dir = isAbove ? '▲' : '▼';
      const refFormatted = referencePrice.toFixed(2).replace('.', ',');
      ctx.fillText(`${dir} REF $${refFormatted}`, pad.left + 4, arrowY + 3);
    }
  }

  // Price line
  const lastPrice = closes[closes.length - 1];
  const isUp = lastPrice >= closes[0];
  const lineColor = isUp ? BLUE : '#ef4444';

  // Smooth bezier
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(closes[0]));
  for (let i = 1; i < closes.length; i++) {
    const cpx = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpx, toY(closes[i - 1]), cpx, toY(closes[i]), toX(i), toY(closes[i]));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gradient fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(closes[0]));
  for (let i = 1; i < closes.length; i++) {
    const cpx = (toX(i - 1) + toX(i)) / 2;
    ctx.bezierCurveTo(cpx, toY(closes[i - 1]), cpx, toY(closes[i]), toX(i), toY(closes[i]));
  }
  ctx.lineTo(toX(closes.length - 1), pad.top + ch);
  ctx.lineTo(toX(0), pad.top + ch);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  fillGrad.addColorStop(0, isUp ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)');
  fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Current price dot + glow
  const lastX = toX(closes.length - 1);
  const lastY = toY(lastPrice);

  ctx.beginPath();
  ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
  ctx.fillStyle = lineColor + '22';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Price badge — ondalık gösterim
  ctx.fillStyle = isUp ? BLUE : '#ef4444';
  const bw = 62, bh = 18;
  const bx = width - pad.right + 2;
  roundRect(ctx, bx, lastY - bh / 2, bw, bh, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${lastPrice.toFixed(2)}`, bx + bw / 2, lastY + 3);

  // Time axis
  ctx.fillStyle = '#4a5568';
  ctx.font = '8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const steps = Math.min(4, closes.length - 1);
  const interval = Math.floor((closes.length - 1) / steps);
  for (let i = 0; i <= steps; i++) {
    const idx = i * interval;
    const t = new Date(times[idx]);
    ctx.fillText(
      `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
      toX(idx),
      pad.top + ch + 14
    );
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function Loading() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-slate-800 animate-pulse" />
        <div className="h-4 w-36 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="h-6 w-28 bg-slate-800 rounded animate-pulse mb-3" />
      <div className="h-40 bg-slate-800/40 rounded-xl animate-pulse mb-4" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 bg-green-900/20 rounded-lg animate-pulse" />
        <div className="h-10 bg-red-900/20 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
