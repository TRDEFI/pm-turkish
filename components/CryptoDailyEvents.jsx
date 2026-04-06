'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const TOKENS = [
  { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, threshold: 70000, accent: '#f7931a', icon: '₿' },
  { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, threshold: 2200, accent: '#627eea', icon: 'Ξ' },
  { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, threshold: 1.4000, accent: '#00aae4', icon: '✕' },
  { symbol: 'SOL', pair: 'SOLUSDT', decimals: 2, threshold: 130, accent: '#9945FF', icon: '◎' },
  { symbol: 'DOGE', pair: 'DOGEUSDT', decimals: 6, threshold: 0.170000, accent: '#C2A633', icon: 'Ð' },
  { symbol: 'AVAX', pair: 'AVAXUSDT', decimals: 2, threshold: 25, accent: '#E84142', icon: '🔺' },
];

const DEADLINE_TIME = '23:59';
const DEADLINE_TZ = 'GMT+3';

function getDeadlineMs() {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const target = new Date(local);
  target.setHours(23, 59, 59, 0);
  if (target <= local) { target.setDate(target.getDate() + 1); }
  return target.getTime() - (local.getTime() - now.getTime());
}

function formatPrice(val, dec) {
  if (val >= 1000) return val.toFixed(dec === 4 ? 2 : 0);
  return val.toFixed(dec);
}

async function fetchGatePrice(pair) {
  try {
    const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${pair}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.priceData?.price) return parseFloat(data.priceData.price);
  } catch { /* fallback below */ }
  return null;
}

export default function CryptoDailyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const results = await Promise.all(
        TOKENS.map(async (t) => {
          const price = await fetchGatePrice(t.pair);
          const diff = price !== null ? +(price - t.threshold).toFixed(t.decimals) : null;
          const status = diff !== null ? (price >= t.threshold ? 'above' : 'below') : 'waiting';
          return { ...t, price, diff, status, hasData: price !== null };
        })
      );
      setEvents(results);
      setLastUpdate(Date.now());
    } finally { setLoading(false); setFetching(false); }
  }, []);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => { const t = setInterval(() => load(true), REFRESH_INTERVAL); return () => clearInterval(t); }, [load]);

  const timeAgo = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-700 border-t-sky-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Kripto fiyatları yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'animate-pulse bg-sky-300' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{timeAgo()}</span>
          <span className="text-xs text-slate-600">· {events.length} token · Gate.io</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:text-slate-700">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((evt) => (
          <CryptoDailyCard key={evt.symbol} event={evt} />
        ))}
      </div>
    </div>
  );
}

function CryptoDailyCard({ event }) {
  const { symbol, price, threshold, diff, hasData, accent, icon, decimals } = event;

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
  const statusLabel = event.status === 'above' ? 'ÜSTÜNDE 🟢' : event.status === 'below' ? 'ALTINDA 🔴' : 'BEKLENİYOR ⏳';

  const question = `${icon} ${symbol} — Bugün 23:59 GMT+3'e kadar $${formatPrice(threshold, decimals)}'ı geçer mi?`;

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/30 overflow-hidden transition-all duration-200 hover:shadow-lg">
      <div className="p-3">
        {/* Question */}
        <h3 className="text-[11.5px] font-semibold text-slate-100 leading-[1.35] line-clamp-2 mb-3">{question}</h3>

        {/* Price row */}
        <div className="flex items-center justify-between mb-3">
          {/* Current */}
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Şu An</p>
            <p className="text-xl font-bold text-white tabular-nums animate-pulse" style={{ color: hasData ? accent : undefined }}>
              {hasData ? `$${formatPrice(price, decimals)}` : '—'}
            </p>
          </div>

          {/* Diff */}
          {diff !== null && (
            <div className="flex flex-col items-center px-2">
              <span className="text-[9px] text-slate-500 mb-0.5">Fark</span>
              <span className={`text-sm font-bold ${diffColor}`}>
                {diff > 0 ? '↑' : '↓'} {diffSign}{diff}
              </span>
            </div>
          )}

          {/* Threshold */}
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hedef</p>
            <p className="text-xl font-bold text-sky-400 tabular-nums">${formatPrice(threshold, decimals)}</p>
            {hasData && (
              <div className="w-14 mt-1 mx-auto">
                <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(5, (price / (threshold * 1.2)) * 100))}%`,
                      backgroundColor: price >= threshold ? accent : '#3b82f6',
                    }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EVET / HAYIR */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.97]">
            ✓ EVET
          </button>
          <button className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all active:scale-[0.97]">
            ✗ HAYIR
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
            event.status === 'above' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            event.status === 'below' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>{statusLabel}</span>
          <span>23:59 GMT+3</span>
        </div>
      </div>
    </div>
  );
}
