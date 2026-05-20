'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { translateQuestion } from '../lib/autoTranslate';

const REFRESH_INTERVAL = 15 * 60 * 1000;
const ICONS = { USD: '💵', EUR: '💶', GBP: '💷' };
const ACCENT = { USD: '#34d399', EUR: '#818cf8', GBP: '#f59e0b' };
const TURKISH_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Compute deadline description dynamically from ISO string
function getDeadlineLabel(isoString) {
  if (!isoString) return null;
  const deadline = new Date(isoString);
  const now = new Date();

  // Calculate days until deadline
  const msPerDay = 86400000;
  const daysUntil = Math.round((deadline - now) / msPerDay);

  if (daysUntil <= 0) return { label: 'Kapanıyor', short: '≈0g', urgent: true };
  if (daysUntil === 1) return { label: 'Yarın GMT+3 23:59\'da', short: 'Yarın', urgent: false };
  if (daysUntil <= 7) {
    const dayName = TURKISH_DAYS[deadline.getUTCDay()];
    return { label: `Bu ${dayName} GMT+3 23:59'da`, short: dayName, urgent: daysUntil <= 2 };
  }
  const dayName = TURKISH_DAYS[deadline.getUTCDay()];
  return { label: `${dayName}`, short: dayName, urgent: false };
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
        const rawSymbol = evt.question?.includes('USD') ? 'USD'
          : evt.question?.includes('EUR') ? 'EUR'
          : evt.question?.includes('GBP') ? 'GBP' : null;
        const currentPrice = rawSymbol ? rateMap[rawSymbol] : null;
        const threshold = evt.threshold || 0;
        const diff = currentPrice != null ? +(currentPrice - threshold).toFixed(4) : null;
        const deadlineInfo = getDeadlineLabel(evt.deadline);

        // Rewrite question with dynamic deadline
        const currencyName = rawSymbol === 'USD' ? 'ABD Doları' : rawSymbol === 'EUR' ? 'Euro' : 'İngiliz Sterlini';
        const questionTr = `${ICONS[rawSymbol] || '💱'} ${rawSymbol}/TRY — ${deadlineInfo?.label || 'bu Cuma'} ${threshold.toFixed(4)}₺ üzerine çıkar mı?`;

        return {
          ...evt,
          symbol: rawSymbol,
          currentPrice,
          diff,
          threshold,
          deadlineInfo,
          _icon: ICONS[rawSymbol] || '💱',
          _accent: ACCENT[rawSymbol] || '#34d399',
          _decimals: 4,
          _questionOverride: questionTr,
          _currencyName: currencyName,
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
    if (s < 60) return `${s}sn`;
    return `${Math.floor(s / 60)}dk`;
  };

  if (!mounted || loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-[2px] border-slate-800 border-t-emerald-400 animate-spin" />
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 20px rgba(52,211,153,0.3)', animation: 'pulse-ring 1.5s ease-in-out infinite' }} />
      </div>
      <p className="text-slate-500 text-xs animate-pulse">Döviz verileri yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-rose-400 text-sm mb-1">Yüklenemedi</p>
      <p className="text-slate-600 text-xs">{error}</p>
      <button onClick={() => load(false)} className="mt-3 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-80"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
        ↻ Tekrar Dene
      </button>
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4 animate-bounce">💱</div>
      <p className="text-slate-400 text-base font-semibold">Döviz tahminleri yakında burada</p>
      <p className="text-slate-600 text-xs mt-2">Her gün 00:00 UTC'de AI tarafından oluşturulur</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              💱
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0d15]"
              style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Döviz Tahminleri</div>
            <div className="text-[10px] text-slate-600">USD/EUR/GBP vs TRY</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${fetching ? 'animate-pulse' : 'bg-emerald-500'}`}
              style={!fetching ? { boxShadow: '0 0 6px #34d399' } : {}} />
            {fetching ? 'Güncelleniyor...' : timeAgo()}
          </div>
          <button onClick={() => load(false)} disabled={fetching}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            ↻
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((evt) => {
          const {
            symbol, currentPrice, diff, threshold, _icon: icon, _accent: accent,
            _decimals: decimals, _questionOverride: displayQuestion, deadlineInfo, deadline
          } = evt;

          if (!symbol) return null;
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const diffColor = diff !== null ? (diff >= 0 ? '#34d399' : '#f43f5e') : '#64748b';
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const isAbove = diff !== null && diff >= 0;
          const isUrgent = deadlineInfo?.urgent;
          const progressPct = currentPrice && threshold > 0
            ? Math.min(100, Math.max(1, ((currentPrice / threshold) * 100) - 90))
            : 1;
          const normalizedPct = Math.min(100, Math.max(2, (currentPrice / (threshold * 1.05)) * 100));

          return (
            <div key={evt.id || symbol}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
              style={{
                background: 'linear-gradient(145deg, #0c0f1e 0%, #0e1225 50%, #0c0f1e 100%)',
                border: `1px solid ${accent}20`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${accent}08, inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${accent}50`;
                e.currentTarget.style.boxShadow = `0 0 40px ${accent}20, 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${accent}20`;
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${accent}08, inset 0 1px 0 rgba(255,255,255,0.03)`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}>

              {/* Top glowing bar */}
              <div style={{
                height: '3px',
                background: `linear-gradient(90deg, transparent 0%, ${accent} 30%, ${accent} 70%, transparent 100%)`,
                boxShadow: `0 0 12px ${accent}80, 0 0 24px ${accent}40`,
              }} />

              {/* Urgent pulse for imminent deadlines */}
              {isUrgent && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                  style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f43f5e', boxShadow: '0 0 10px rgba(239,68,68,0.2)',
                  }}>
                  ⏰ YAKIN
                </div>
              )}

              <div className="p-4">
                {/* Currency header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{symbol}/TRY</span>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {deadlineInfo?.label || 'Forex Piyasası'}
                    </div>
                  </div>
                </div>

                {/* Current price — BIG */}
                <div className="mb-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Şu An</div>
                  <div className="text-3xl font-black text-white tabular-nums"
                    style={{ textShadow: `0 0 30px rgba(255,255,255,0.2)` }}>
                    {currentPrice ? `${currentPrice.toFixed(decimals)}₺` : '—'}
                  </div>
                  {diff !== null && (
                    <div className="text-sm font-bold mt-1 tabular-nums" style={{ color: diffColor, textShadow: `0 0 12px ${diffColor}60` }}>
                      {diff > 0 ? '↑' : '↓'} {diffSign}{diff}₺
                    </div>
                  )}
                </div>

                {/* Target */}
                <div className="mb-3 p-2 rounded-xl text-center"
                  style={{ background: `${accent}08`, border: `1px solid ${accent}15` }}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Hedef Fiyat</div>
                  <div className="text-lg font-black tabular-nums" style={{ color: accent, textShadow: `0 0 20px ${accent}60` }}>
                    {threshold.toFixed(decimals)}₺
                  </div>
                </div>

                {/* Progress bar */}
                {currentPrice && threshold > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                      <span>{currentPrice.toFixed(decimals)}₺</span>
                      <span>{threshold.toFixed(decimals)}₺</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${normalizedPct}%`,
                          background: `linear-gradient(90deg, ${accent}90, ${accent})`,
                          boxShadow: `0 0 10px ${accent}`,
                        }} />
                    </div>
                    <div className="flex justify-between text-[8px] mt-0.5">
                      <span style={{ color: accent }}>{isAbove ? '✓ ÜSTÜNDE' : 'Altında'}</span>
                      <span className="text-slate-600">{diffSign}{((diff / threshold) * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                )}

                {/* Question */}
                <p className="text-[10px] text-slate-400 leading-snug mb-3 line-clamp-2 italic">
                  {displayQuestion}
                </p>

                {/* EVET / HAYIR buttons */}
                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.96]"
                      style={{
                        background: isAbove
                          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                          : 'rgba(52,211,153,0.08)',
                        border: isAbove
                          ? 'none'
                          : '1px solid rgba(52,211,153,0.2)',
                        color: isAbove ? '#ffffff' : '#34d399',
                        boxShadow: isAbove
                          ? '0 0 20px rgba(34,197,94,0.4)'
                          : '0 0 10px rgba(52,211,153,0.08)',
                      }}>
                      ✓ EVET {isAbove && ' 🟢'}
                    </button>
                    <button className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.96]"
                      style={{
                        background: !isAbove
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'rgba(244,63,94,0.08)',
                        border: !isAbove
                          ? 'none'
                          : '1px solid rgba(244,63,94,0.2)',
                        color: !isAbove ? '#ffffff' : '#f43f5e',
                        boxShadow: !isAbove
                          ? '0 0 20px rgba(239,68,68,0.4)'
                          : '0 0 10px rgba(244,63,94,0.08)',
                      }}>
                      ✗ HAYIR {!isAbove && ' 🔴'}
                    </button>
                  </div>
                )}

                {isExpired && (
                  <div className="py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b' }}>
                    ⏰ Süre Doldu
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
