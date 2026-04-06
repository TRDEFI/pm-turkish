'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const RATES = [
  { symbol: 'USD', currency: 'USD/TRY', base: 'USD', target: 'TRY', decimals: 4, threshold: 40.0000, icon: '💵' },
  { symbol: 'EUR', currency: 'EUR/TRY', base: 'EUR', target: 'TRY', decimals: 4, threshold: 43.5000, icon: '💶' },
  { symbol: 'GBP', currency: 'GBP/TRY', base: 'GBP', target: 'TRY', decimals: 4, threshold: 51.0000, icon: '💷' },
];

const DEADLINE_TIME = '16:45 GMT+3';

async function fetchRate(base, target) {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // API returns base=1, so USD base → rates.TRY = ~40
    if (data.rates?.[target]) return parseFloat(data.rates[target]);
  } catch { /* fallback */ }
  return null;
}

export default function ForexEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const results = await Promise.all(
        RATES.map(async (r) => {
          const price = await fetchRate(r.base, r.target);
          const diff = price !== null ? +(price - r.threshold).toFixed(r.decimals) : null;
          const status = diff !== null ? (price >= r.threshold ? 'above' : 'below') : 'waiting';
          return { ...r, price, diff, status, hasData: price !== null };
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
        <p className="text-slate-400 text-sm">Döviz kurları yükleniyor...</p>
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
          <span className="text-xs text-slate-600">· {events.length} kur · open.er-api.com</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:text-slate-700">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {events.map((evt) => (
          <ForexCard key={evt.symbol} event={evt} />
        ))}
      </div>
    </div>
  );
}

function ForexCard({ event }) {
  const { symbol, currency, price, threshold, diff, hasData, icon, decimals } = event;

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
  const status = diff !== null ? (price >= threshold ? 'above' : 'below') : 'waiting';
  const statusLabel = status === 'above' ? 'ÜSTÜNDE 🟢' : status === 'below' ? 'ALTINDA 🔴' : 'BEKLENİYOR ⏳';

  const question = `${icon} ${currency} — Bugün ${DEADLINE_TIME} sonuç $${threshold.toFixed(decimals)}'ı geçer mi?`;

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
            <p className="text-xl font-bold text-white tabular-nums animate-pulse">
              {hasData ? `${price?.toFixed(decimals)}₺` : '—'}
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
            <p className="text-xl font-bold text-sky-400 tabular-nums">${threshold.toFixed(decimals)}</p>
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
            status === 'above' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            status === 'below' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>{statusLabel}</span>
          <span>{DEADLINE_TIME}</span>
        </div>
      </div>
    </div>
  );
}
