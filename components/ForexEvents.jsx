'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const ICONS = { USD: '💵', EUR: '💶', GBP: '💷' };

// Fetch FX rate
async function fetchRate(base, target) {
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data.rates?.[target] ? parseFloat(data.rates[target]) : null;
  } catch { return null; }
}

function getSymbolFromQuestion(q) {
  if (!q) return null;
  if (q.includes('USD')) return 'USD';
  if (q.includes('EUR')) return 'EUR';
  if (q.includes('GBP')) return 'GBP';
  return null;
}

export default function ForexEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      // Fetch AI-generated doviz events from Supabase
      const res = await fetch('/.netlify/functions/fetch-events?category=doviz');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const supabaseEvents = Array.isArray(data) ? data : [];

      // Fetch live rates in parallel
      const rates = await Promise.all([
        fetchRate('USD', 'TRY'),
        fetchRate('EUR', 'TRY'),
        fetchRate('GBP', 'TRY'),
      ]);
      const rateMap = { USD: rates[0], EUR: rates[1], GBP: rates[2] };

      const enriched = supabaseEvents.map(evt => {
        const symbol = getSymbolFromQuestion(evt.question);
        const currentPrice = symbol ? rateMap[symbol] : null;
        const threshold = evt.threshold || 0;
        const diff = currentPrice != null ? +(currentPrice - threshold).toFixed(4) : null;
        return {
          ...evt,
          symbol,
          currentPrice,
          diff,
          _icon: ICONS[symbol] || '💱',
          _decimals: 4,
        };
      });

      setEvents(enriched);
      setLastUpdate(Date.now());
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(true), REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [load]);

  const timeAgo = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    if (s < 60) return `${s}sn önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-800 border-t-emerald-400 animate-spin" />
        <p className="text-slate-400 text-sm">Döviz kurları yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm mb-2">Veri yüklenemedi: {error}</p>
        <button onClick={() => load(false)} className="text-emerald-400 hover:text-emerald-300 text-xs">↻ Tekrar dene</button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">💱</p>
        <p className="text-slate-400 text-sm">Yeni günlük döviz tahminleri yakında oluşturulacak...</p>
        <p className="text-slate-500 text-xs mt-1">Her gün saat 00:00'da AI tarafından oluşturulur</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'bg-emerald-300 animate-pulse' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgo()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">{events.length} kur · open.er-api.com + AI</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-3 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-40">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((evt) => {
          const { symbol, currentPrice, threshold, diff, _icon: icon, _decimals: decimals, question, deadline } = evt;
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const statusLabel = isExpired ? 'SÜRE DOLDI'
            : diff !== null ? (diff >= 0 ? 'ÜSTÜNDE 🟢' : 'ALTINDA 🔴')
            : 'BEKLENİYOR ⏳';

          return (
            <div key={evt.id || symbol}
              className="group relative bg-[#0f1420] rounded-xl border border-white/5 hover:border-emerald-500/30 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-bold text-white">{symbol}/TRY</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isExpired ? 'bg-slate-800 text-slate-500 border-slate-700'
                    : diff !== null && diff >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : diff !== null ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>{statusLabel}</span>
                </div>

                {/* Question */}
                <p className="text-[11px] text-slate-400 leading-snug mb-4 line-clamp-2">
                  {question || `${icon} ${symbol}/TRY — yarın ${threshold.toFixed(decimals)}₺ üzerine çıkar mı?`}
                </p>

                {/* Price row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Şu an</p>
                    <p className="text-xl font-bold text-white tabular-nums animate-pulse">
                      {currentPrice ? `${currentPrice.toFixed(decimals)}₺` : '—'}
                    </p>
                  </div>

                  {diff !== null && (
                    <div className="flex flex-col items-center px-3">
                      <span className="text-[9px] text-slate-500 mb-1">Fark</span>
                      <span className={`text-base font-bold ${diffColor}`}>
                        {diff > 0 ? '↑' : '↓'} {diffSign}{diff}
                      </span>
                    </div>
                  )}

                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Hedef</p>
                    <p className="text-xl font-bold text-emerald-400 tabular-nums">
                      {threshold.toFixed(decimals)}₺
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {currentPrice && threshold > 0 && (
                  <div className="mb-4">
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min(100, (currentPrice / (threshold * (diff >= 0 ? 1.05 : 1.0))) * 100)}%`,
                          background: diff >= 0
                            ? 'linear-gradient(90deg, #10b981cc, #10b981)'
                            : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                        }} />
                    </div>
                  </div>
                )}

                {/* EVET / HAYIR */}
                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 active:scale-[0.97] transition-all">
                      ✓ EVET
                    </button>
                    <button className="py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-[0.97] transition-all">
                      ✗ HAYIR
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
