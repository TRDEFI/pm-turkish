'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 60 * 1000; // 1 minute - match 5-min window duration

// Map stored symbol from question text to display properties
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

      // Also fetch current prices for display comparison
      const priceRes = await fetch('/.netlify/functions/binance-proxy?symbol=BTCUSDT');
      const priceData = priceRes.ok ? await priceRes.json() : null;
      const currentPrices = priceData?.priceData?.price ? { BTC: parseFloat(priceData.priceData.price) } : {};

      // Filter to only active 5dk events
      const active5dk = (Array.isArray(data) ? data : []).filter(e => e.category === 'kripto-5dk');

      // Enrich with current price for display
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
  useEffect(() => { const t = setInterval(() => load(true), REFRESH_INTERVAL); return () => clearInterval(t); }, [load]);

  const timeAgo = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    if (s < 60) return `${s}s önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return '—';
    const d = new Date(deadline);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-700 border-t-sky-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">5-dk kripto verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        <p>Veri yüklenemedi: {error}</p>
        <button onClick={() => load(false)} className="mt-2 text-sky-400 hover:text-sky-300 text-xs">↻ Tekrar dene</button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">⏳</p>
        <p className="text-slate-400 text-sm">Yeni 5-dk pencereler yakında oluşturulacak...</p>
        <p className="text-slate-500 text-xs mt-1">Her 5 dakikada yeni event oluşur</p>
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
          <span className="text-xs text-slate-600">· {events.length} pencere · Gate.io</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching}
          className="text-xs px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:text-slate-700">
          ↻ Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {events.map((evt) => (
          <Crypto5minCard key={evt.id} event={evt} />
        ))}
      </div>
    </div>
  );
}

function Crypto5minCard({ event }) {
  const { _props: props, _currentPrice: currentPrice, opening_price, threshold, question, deadline } = event;

  const current = currentPrice || opening_price;
  const diff = current && threshold ? +(current - threshold).toFixed(props.decimals) : null;
  const diffColor = diff !== null ? (diff >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600';
  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';

  const isExpired = deadline ? new Date(deadline) < new Date() : false;

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/30 overflow-hidden transition-all duration-200">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ color: props.accent }} className="text-lg font-bold">{props.icon}</span>
            <span className="text-xs font-semibold text-white">{props.symbol}</span>
          </div>
          <div className="text-right">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isExpired ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isExpired ? 'SÜRE DOLDI ⏳' : `${formatDeadline(deadline)}'da sona erer`}
            </span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-[11px] font-semibold text-slate-100 leading-[1.35] line-clamp-2 mb-3">
          {question}
        </h3>

        {/* Price info */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Açılış</p>
            <p className="text-lg font-bold text-white tabular-nums">
              {opening_price ? `$${Number(opening_price).toFixed(props.decimals)}` : '—'}
            </p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hedef</p>
            <p className="text-lg font-bold text-sky-400 tabular-nums">
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

        {/* EVET / HAYIR */}
        {!isExpired && (
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <button className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.97]">
              ✓ EVET
            </button>
            <button className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all active:scale-[0.97]">
              ✗ HAYIR
            </button>
          </div>
        )}

        <p className="text-[9px] text-slate-500 text-center">Gate.io 5-dk kline</p>
      </div>
    </div>
  );
}
