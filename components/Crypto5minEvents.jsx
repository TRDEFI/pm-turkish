'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 60 * 1000;

function getCryptoProps(question) {
  if (question?.includes('₿') || question?.includes('BTC')) return { symbol: 'BTC', accent: '#f7931a', icon: '₿' };
  if (question?.includes('Ξ') || question?.includes('ETH')) return { symbol: 'ETH', accent: '#627eea', icon: 'Ξ' };
  if (question?.includes('XRP') || question?.includes('✕')) return { symbol: 'XRP', accent: '#00aae4', icon: '✕' };
  return { symbol: '???', accent: '#888', icon: '?' };
}

export default function Crypto5minEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch('/.netlify/functions/fetch-events?category=kripto-5dk');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const priceRes = await fetch('/.netlify/functions/binance-proxy?symbol=BTCUSDT');
      const priceData = priceRes.ok ? await priceRes.json() : null;
      const currentPrices = priceData?.priceData?.price ? { BTC: parseFloat(priceData.priceData.price) } : {};

      const active5dk = (Array.isArray(data) ? data : []).filter(e => e.category === 'kripto-5dk');
      const enriched = active5dk.map(evt => {
        const props = getCryptoProps(evt.question);
        const currentPrice = currentPrices[props.symbol];
        return { ...evt, _props: props, _currentPrice: currentPrice };
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

  const formatDeadline = (deadline) => {
    if (!deadline) return '—';
    return new Date(deadline).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-8 h-8 rounded-full border-[2px] border-slate-800 border-t-orange-400 animate-spin" />
        <p className="text-slate-500 text-xs">5-dk kripto verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-xs text-slate-500">
        <p>Veri yüklenemedi: {error}</p>
        <button onClick={() => load(false)} className="mt-2 text-orange-400 hover:text-orange-300">↻ Tekrar dene</button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">⏳</p>
        <p className="text-slate-400 text-sm">Yeni 5-dk pencereler oluşturuluyor...</p>
        <p className="text-slate-600 text-xs mt-1">Her 5 dakikada yeni event</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#f97316' }} />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'animate-pulse' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgo()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">{events.length} pencere</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-3 py-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-40">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {events.map((evt) => {
          const { _props: props, _currentPrice: currentPrice, opening_price, threshold, question, deadline } = evt;
          const current = currentPrice || opening_price;
          const diff = current && threshold ? +(current - threshold).toFixed(props.decimals) : null;
          const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const progressPct = current && threshold ? Math.min(100, Math.max(2, (current / (threshold * (diff >= 0 ? 1.1 : 1.0))) * 100)) : 2;

          return (
            <div key={evt.id}
              className="group relative rounded-xl border overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #0d1020 0%, #0f1420 100%)',
                borderColor: 'rgba(249,115,22,0.15)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(249,115,22,0.08)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(249,115,22,0.2), 0 8px 40px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.15)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(249,115,22,0.08)';
              }}>
              {/* Top neon accent */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                boxShadow: '0 0 10px #f97316',
                opacity: 0.6, transition: 'opacity 0.3s',
              }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold" style={{ color: props.accent }}>{props.icon}</span>
                    <span className="text-sm font-bold text-white">{props.symbol}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isExpired ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  }`}>
                    {isExpired ? 'SÜRE DOLDU ⏳' : `${formatDeadline(deadline)}'da sona erer`}
                  </span>
                </div>

                {/* Question */}
                <p className="text-[11px] text-slate-400 leading-snug mb-4 line-clamp-2">
                  {question}
                </p>

                {/* Price row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Açılış</p>
                    <p className="text-lg font-bold text-white tabular-nums">
                      {opening_price ? `$${Number(opening_price).toFixed(props.decimals)}` : '—'}
                    </p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hedef</p>
                    <p className="text-lg font-bold text-orange-400 tabular-nums">
                      {threshold ? `$${Number(threshold).toFixed(props.decimals)}` : '—'}
                    </p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Fark</p>
                    <p className={`text-lg font-bold tabular-nums ${diffColor}`}>
                      {diff !== null ? `${diff > 0 ? '↑' : '↓'} ${diffSign}${diff}` : '—'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {current && threshold > 0 && (
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${progressPct}%`,
                          background: diff >= 0
                            ? `linear-gradient(90deg, ${props.accent}cc, ${props.accent})`
                            : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                          boxShadow: diff >= 0 ? `0 0 8px ${props.accent}` : '0 0 8px #3b82f6',
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
