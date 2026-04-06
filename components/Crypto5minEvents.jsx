'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const COINS = [
  { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, accent: '#f7931a', icon: '₿', yRange: 100 },
  { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, accent: '#627eea', icon: 'Ξ', yRange: 5 },
  { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, accent: '#00aae4', icon: '✕', yRange: 0.005 },
];

function thresholdFrom(price, yRange) {
  return +(price + yRange / 2).toFixed(yRange < 1 ? 6 : 0);
}

async function fetchGateData(symbol) {
  try {
    const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.priceData?.price) {
      return {
        price: parseFloat(data.priceData.price),
        ref: data.klines5m?.length > 0 ? parseFloat(data.klines5m[data.klines5m.length - 1][1]) : null,
        change: parseFloat(data.priceData.price24hPct || 0) || 0,
      };
    }
  } catch { /* ignore */ }
  return null;
}

export default function Crypto5minEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const results = await Promise.all(
        COINS.map(async (c) => {
          const data = await fetchGateData(c.pair);
          if (!data || !data.price) return { ...c, price: null, threshold: null, diff: null, status: 'waiting', hasData: false };

          const thr = thresholdFrom(data.price, c.yRange);
          const diff = +(data.price - thr).toFixed(c.decimals);
          const status = data.price >= thr ? 'above' : 'below';

          return { ...c, price: data.price, threshold: thr, diff, status, hasData: true, change: data.change, ref: data.ref };
        }),
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
        <p className="text-slate-400 text-sm">5-dk kripto verileri yükleniyor...</p>
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
          <span className="text-xs text-slate-600">· {events.length} coin · 5-dk pencere</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:text-slate-700">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {events.map((evt) => (
          <Crypto5minCard key={evt.symbol} event={evt} />
        ))}
      </div>
    </div>
  );
}

function Crypto5minCard({ event }) {
  const { symbol, price, threshold, diff, hasData, accent, icon, decimals, change } = event;

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
  const changeUp = change >= 0;

  const question = `${icon} ${symbol} — Sonraki 5 dakikada $${price !== null ? (price + (Math.abs(price) * 0.007)).toFixed(decimals) : '...'}'ı geçer mi?`;

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/30 overflow-hidden transition-all duration-200">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: accent }} className="text-lg font-bold">{icon}</span>
          <div>
            <span className="text-xs font-semibold text-white">{symbol}</span>
            <span className={`text-[9px] ml-1.5 px-1.5 py-0.5 rounded ${changeUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {changeUp ? '+' : ''}{change?.toFixed(3)}%
            </span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-[11px] font-semibold text-slate-100 leading-[1.35] line-clamp-2 mb-2.5">
          {hasData
            ? `${icon} ${symbol} — Sonraki 5 dk'da $${(price + (price > 1000 ? price * 0.007 : price > 1 ? price * 0.01 : price * 0.015)).toFixed(decimals)} seviyesini geçer mi?`
            : 'Veri bekleniyor...'}
        </h3>

        {/* Price row */}
        {hasData && (
          <div className="flex items-center justify-between mb-3">
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Sonraki 5 dk</p>
              <p className="text-2xl font-bold tabular-nums animate-pulse" style={{ color: accent }}>
                ${(price + (price > 1000 ? price * 0.007 : price > 1 ? price * 0.01 : price * 0.015)).toFixed(decimals)}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Şu An</p>
              <p className="text-xl font-bold text-white tabular-nums">${price?.toFixed(decimals)}</p>
              {event.ref && <p className="text-[9px] text-slate-500">Ref: ${event.ref?.toFixed(decimals)}</p>}
            </div>
          </div>
        )}

        {/* EVET / HAYIR */}
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <button className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.97]">
            ✓ EVET
          </button>
          <button className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all active:scale-[0.97]">
            ✗ HAYIR
          </button>
        </div>

        <p className="text-[9px] text-slate-500 text-center">5-dk pencere · Yenilenir her 15 dk</p>
      </div>
    </div>
  );
}
