'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const ICONS = { USD: '💵', EUR: '💶', GBP: '💷' };
const ACCENT = { USD: '#34d399', EUR: '#818cf8', GBP: '#f59e0b' };

// Format deadline day in Turkish
function formatDeadlineDay(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const trDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return trDays[d.getUTCDay()];
}

function getSymbolFromQuestion(q) {
  if (!q) return null;
  if (q.includes('USD')) return 'USD';
  if (q.includes('EUR')) return 'EUR';
  if (q.includes('GBP')) return 'GBP';
  return null;
}

async function fetchRate(base, target) {
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data.rates?.[target] ? parseFloat(data.rates[target]) : null;
  } catch { return null; }
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
      const res = await fetch('/.netlify/functions/fetch-events?category=doviz');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const supabaseEvents = Array.isArray(data) ? data : [];
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
          _accent: ACCENT[symbol] || '#34d399',
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-9 h-9 rounded-full border-[2px] border-slate-800 border-t-emerald-400 animate-spin" />
      <p className="text-slate-500 text-xs">Döviz verileri yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-8 text-xs text-slate-500">
      Yüklenemedi: {error} <button onClick={() => load(false)} className="text-emerald-400 ml-2">↻</button>
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-16">
      <p className="text-3xl mb-2">💱</p>
      <p className="text-slate-400 text-sm">Yeni döviz tahminleri yakında...</p>
      <p className="text-slate-600 text-xs mt-1">Her gün 00:00'da AI tarafından oluşturulur</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: '#34d399' }} />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'animate-pulse' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgo()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">{events.length} kur</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-3 py-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-40">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((evt) => {
          const { symbol, currentPrice, threshold, diff, _icon: icon, _accent: accent, _decimals: decimals, question, deadline } = evt;
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const statusLabel = isExpired ? 'SÜRE DOLDI'
            : diff !== null ? (diff >= 0 ? 'ÜSTÜNDE 🟢' : 'ALTINDA 🔴')
            : 'BEKLENİYOR ⏳';
          const deadlineDay = formatDeadlineDay(deadline);
          const progressPct = currentPrice && threshold > 0
            ? Math.min(100, Math.max(2, (currentPrice / (threshold * (diff >= 0 ? 1.05 : 1.0))) * 100)) : 2;

          return (
            <div key={evt.id || symbol}
              className="group relative bg-[#0d1020] rounded-xl border overflow-hidden transition-all duration-300 cursor-default"
              style={{
                borderColor: `${accent}18`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${accent}08`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${accent}40`;
                e.currentTarget.style.boxShadow = `0 0 30px ${accent}15, 0 8px 40px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${accent}18`;
                e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${accent}08`;
              }}>
              {/* Top neon line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                boxShadow: `0 0 10px ${accent}80`,
              }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <span className="text-sm font-black text-white">{symbol}/TRY</span>
                      <div className="text-[9px] text-slate-600">
                        Kapanış: {deadlineDay} TSİ 23:59
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isExpired ? 'bg-slate-800 text-slate-500 border-slate-700'
                    : diff !== null && diff >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : diff !== null ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                    style={!isExpired && diff >= 0 ? { boxShadow: `0 0 10px ${accent}30` } : {}}>
                    {statusLabel}
                  </span>
                </div>

                {/* Question */}
                <p className="text-[11px] text-slate-400 leading-snug mb-4 line-clamp-2">
                  {question}
                </p>

                {/* Price row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Şu an</p>
                    <p className="text-xl font-black text-white tabular-nums animate-pulse">
                      {currentPrice ? `${currentPrice.toFixed(decimals)}₺` : '—'}
                    </p>
                  </div>
                  {diff !== null && (
                    <div className="flex flex-col items-center px-3">
                      <span className="text-[9px] text-slate-500 mb-1">Fark</span>
                      <span className="text-base font-black" style={{ color: diffColor, textShadow: diff >= 0 ? `0 0 12px ${accent}80` : '0 0 12px #f43f5e80' }}>
                        {diff > 0 ? '↑' : '↓'} {diffSign}{diff}
                      </span>
                    </div>
                  )}
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Hedef</p>
                    <p className="text-xl font-black tabular-nums" style={{ color: accent, textShadow: `0 0 15px ${accent}60` }}>
                      {threshold.toFixed(decimals)}₺
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {currentPrice && threshold > 0 && (
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${progressPct}%`,
                          background: diff >= 0
                            ? `linear-gradient(90deg, ${accent}cc, ${accent})`
                            : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                          boxShadow: `0 0 8px ${accent}`,
                        }} />
                    </div>
                  </div>
                )}

                {/* EVET / HAYIR */}
                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                      style={{
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        color: '#34d399',
                        boxShadow: '0 0 12px rgba(52,211,153,0.1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.1)'}>
                      ✓ EVET
                    </button>
                    <button className="py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                      style={{
                        background: 'rgba(244,63,94,0.08)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        color: '#f43f5e',
                        boxShadow: '0 0 12px rgba(244,63,94,0.1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(244,63,94,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(244,63,94,0.1)'}>
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
