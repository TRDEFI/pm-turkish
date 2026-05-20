'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const ICONS = {
  BTC:  { icon: '₿',  color: '#f7931a' },
  ETH:  { icon: 'Ξ',  color: '#627eea' },
  XRP:  { icon: '✕',  color: '#00aae4' },
  SOL:  { icon: '◎',  color: '#9945FF' },
  DOGE: { icon: 'Ð',  color: '#C2A633' },
  AVAX: { icon: '🔺', color: '#E84142' },
};

// Gate.io current price
async function fetchGatePrice(pair) {
  try {
    const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${pair}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.priceData?.price ? parseFloat(data.priceData.price) : null;
  } catch { return null; }
}

function formatPrice(val, dec) {
  if (val == null) return '—';
  if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return val.toFixed(dec);
}

function getSymbolFromQuestion(q) {
  if (!q) return null;
  if (q.includes('BTC') || q.includes('₿')) return 'BTC';
  if (q.includes('ETH') || q.includes('Ξ')) return 'ETH';
  if (q.includes('XRP') || q.includes('✕')) return 'XRP';
  if (q.includes('SOL') || q.includes('◎')) return 'SOL';
  if (q.includes('DOGE') || q.includes('Ð')) return 'DOGE';
  if (q.includes('AVAX') || q.includes('🔺')) return 'AVAX';
  return null;
}

export default function CryptoDailyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      // Fetch AI-generated kripto-gun events from Supabase
      const res = await fetch('/.netlify/functions/fetch-events?category=kripto-gun');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const supabaseEvents = Array.isArray(data) ? data : [];

      // Fetch live prices in parallel
      const pairs = ['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','DOGEUSDT','AVAXUSDT'];
      const prices = await Promise.all(pairs.map(p => fetchGatePrice(p)));
      const priceMap = {
        BTC: prices[0], ETH: prices[1], XRP: prices[2],
        SOL: prices[3], DOGE: prices[4], AVAX: prices[5],
      };

      // Enrich with live prices
      const enriched = supabaseEvents.map(evt => {
        const symbol = getSymbolFromQuestion(evt.question);
        const currentPrice = symbol ? priceMap[symbol] : null;
        const threshold = evt.threshold || 0;
        const diff = currentPrice != null
          ? +(currentPrice - threshold).toFixed(symbol === 'DOGE' ? 6 : 4)
          : null;
        const meta = ICONS[symbol] || { icon: '?', color: '#888' };
        return { ...evt, symbol, currentPrice, diff, _meta: meta };
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
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-800 border-t-amber-400 animate-spin" />
        <p className="text-slate-400 text-sm">Kripto fiyatları yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm mb-2">Veri yüklenemedi: {error}</p>
        <button onClick={() => load(false)} className="text-amber-400 hover:text-amber-300 text-xs">↻ Tekrar dene</button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">📈</p>
        <p className="text-slate-400 text-sm">Yeni günlük kripto tahminleri yakında oluşturulacak...</p>
        <p className="text-slate-500 text-xs mt-1">Her gün saat 00:00'da AI tarafından oluşturulur</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'bg-amber-300 animate-pulse' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgo()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">{events.length} token · Gate.io + OpenRouter AI</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-3 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-40">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((evt) => {
          const { symbol, currentPrice, threshold, diff, _meta: meta, question, deadline } = evt;
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
          const decimals = symbol === 'DOGE' ? 6 : symbol === 'BTC' ? 0 : 2;
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const statusLabel = isExpired ? 'SÜRE DOLDI'
            : diff !== null ? (diff >= 0 ? 'ÜSTÜNDE 🟢' : 'ALTINDA 🔴')
            : 'BEKLENİYOR ⏳';

          return (
            <div key={evt.id || symbol}
              className="group relative rounded-xl border overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #0d1020 0%, #0f1420 100%)',
                borderColor: `${meta.color}18`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${meta.color}40`;
                e.currentTarget.style.boxShadow = `0 0 30px ${meta.color}18, 0 8px 40px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${meta.color}18`;
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)';
              }}>
              {/* Top neon line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                boxShadow: `0 0 10px ${meta.color}`,
                opacity: 0.5,
              }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold" style={{ color: meta.color }}>{meta.icon}</span>
                    <span className="text-sm font-bold text-white">{symbol}</span>
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
                  {question || `${symbol} yarın $${threshold} üzerine çıkar mı?`}
                </p>

                {/* Price row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Şu an</p>
                    <p className="text-xl font-bold tabular-nums animate-pulse"
                      style={{ color: currentPrice ? meta.color : undefined }}>
                      {currentPrice ? `$${formatPrice(currentPrice, decimals)}` : '—'}
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
                    <p className="text-xl font-bold text-amber-400 tabular-nums">
                      ${formatPrice(threshold, decimals)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {currentPrice && threshold > 0 && (
                  <div className="mb-4">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, (currentPrice / (threshold * (diff >= 0 ? 1.1 : 1.0))) * 100)}%`,
                          background: diff >= 0
                            ? `linear-gradient(90deg, ${meta.color}cc, ${meta.color})`
                            : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                          boxShadow: diff >= 0 ? `0 0 8px ${meta.color}` : '0 0 8px #3b82f6',
                        }} />
                    </div>
                  </div>
                )}

                {/* EVET / HAYIR */}
                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                      style={{
                        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                        color: '#34d399', boxShadow: '0 0 12px rgba(52,211,153,0.1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 20px rgba(52,211,153,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 12px rgba(52,211,153,0.1)'}>
                      ✓ EVET
                    </button>
                    <button className="py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                      style={{
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                        color: '#f43f5e', boxShadow: '0 0 12px rgba(244,63,94,0.1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 20px rgba(244,63,94,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 12px rgba(244,63,94,0.1)'}>
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
