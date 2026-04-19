'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { translateQuestion } from '../lib/autoTranslate';

// Dynamically import CandlestickChart to avoid SSR issues
const CandlestickChart = dynamic(() => import('./CandlestickChart'), { ssr: false });

const REFRESH_INTERVAL = 60 * 1000;

function getCryptoProps(question) {
  if (!question) return { symbol: 'BTC', accent: '#f97316', icon: '₿', decimals: 2, pair: 'BTC_USDT' };
  if (question.includes('BTC') || question.includes('₿')) return { symbol: 'BTC', accent: '#f97316', icon: '₿', decimals: 2, pair: 'BTC_USDT' };
  if (question.includes('ETH') || question.includes('Ξ')) return { symbol: 'ETH', accent: '#627eea', icon: 'Ξ', decimals: 2, pair: 'ETH_USDT' };
  if (question.includes('XRP') || question.includes('✕')) return { symbol: 'XRP', accent: '#00aae4', icon: '✕', decimals: 4, pair: 'XRP_USDT' };
  return { symbol: 'BTC', accent: '#f97316', icon: '₿', decimals: 2, pair: 'BTC_USDT' };
}

// Fetch orderbook to estimate volume/liquidity
async function fetchOrderbook(pair) {
  try {
    const r = await fetch(`https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${pair}&limit=5`);
    if (!r.ok) return null;
    const data = await r.json();
    return {
      asks: data.asks || [],
      bids: data.bids || [],
    };
  } catch { return null; }
}

export default function Crypto5minEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [orderbooks, setOrderbooks] = useState({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch('/.netlify/functions/fetch-events?category=kripto-5dk');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Fetch orderbooks for all pairs in parallel
      const pairs = ['BTC_USDT', 'ETH_USDT', 'XRP_USDT'];
      const obResults = await Promise.all(pairs.map(p => fetchOrderbook(p)));
      const obMap = {};
      pairs.forEach((p, i) => { obMap[p] = obResults[i]; });

      const active5dk = (Array.isArray(data) ? data : []).filter(e => e.category === 'kripto-5dk');
      const enriched = active5dk.map(evt => {
        const props = getCryptoProps(evt.question);
        const current = evt.opening_price || 0;
        const diff = evt.threshold ? +(current - evt.threshold).toFixed(props.decimals) : null;
        const ob = obMap[props.pair];

        // Estimate volume from orderbook spread
        let spreadPct = null;
        let liqEstimate = null;
        if (ob && ob.asks.length && ob.bids.length) {
          const bestAsk = parseFloat(ob.asks[0][0]);
          const bestBid = parseFloat(ob.bids[0][0]);
          if (bestAsk && bestBid) {
            spreadPct = ((bestAsk - bestBid) / bestBid * 100).toFixed(3);
            // Rough liquidity: sum of top 5 levels
            const askVol = ob.asks.slice(0, 5).reduce((s, a) => s + parseFloat(a[1] || 0), 0);
            const bidVol = ob.bids.slice(0, 5).reduce((s, b) => s + parseFloat(b[1] || 0), 0);
            liqEstimate = Math.round((askVol + bidVol) * current);
          }
        }

        return {
          ...evt,
          _props: props,
          _diff: diff,
          _spreadPct: spreadPct,
          _liqEstimate: liqEstimate,
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

  const formatLiq = (n) => {
    if (!n) return '—';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-[2px] border-slate-800 border-t-orange-400 animate-spin" />
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.3)' }} />
      </div>
      <p className="text-slate-500 text-sm animate-pulse">5-dk kripto verileri yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-rose-400 text-sm mb-1">Yüklenemedi</p>
      <p className="text-slate-600 text-xs mb-3">{error}</p>
      <button onClick={() => load(false)}
        className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-80"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
        ↻ Tekrar Dene
      </button>
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4 animate-bounce">⏱️</div>
      <p className="text-slate-400 text-base font-semibold">Yeni pencere yakında başlıyor</p>
      <p className="text-slate-600 text-xs mt-2">Her 5 dakikada yeni BTC/ETH/XRP tahmini</p>
    </div>
  );

  // Find BTC event for chart (first one)
  const btcEvent = events.find(e => e._props?.symbol === 'BTC') || events[0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(249,115,22,0.3)',
          }}>
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Kısa Süreli Kripto</div>
            <div className="text-[10px] text-slate-600">Gate.io Canlı Veriler</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${fetching ? 'animate-pulse' : ''}`}
              style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
            {fetching ? 'Güncelleniyor...' : timeAgo()}
          </div>
          <button onClick={() => load(false)} disabled={fetching}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            ↻
          </button>
        </div>
      </div>

      {/* Candlestick Chart — BTC (full width) */}
      {btcEvent && (
        <div className="mb-4 rounded-2xl border overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0c0f1e 0%, #0e1225 100%)',
            borderColor: 'rgba(249,115,22,0.2)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.1)',
          }}>
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
            boxShadow: '0 0 15px rgba(249,115,22,0.5)',
          }} />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">₿</span>
                <div>
                  <span className="text-base font-black text-white">BTC/USDT</span>
                  <div className="text-[9px] text-slate-500">Gate.io · 1m Grafik</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                {btcEvent._liqEstimate && (
                  <div className="text-center">
                    <div className="text-slate-500">Likidite</div>
                    <div className="text-white font-bold">{formatLiq(btcEvent._liqEstimate)}</div>
                  </div>
                )}
                {btcEvent._spreadPct && (
                  <div className="text-center">
                    <div className="text-slate-500">Spread</div>
                    <div className="text-white font-bold">%{btcEvent._spreadPct}</div>
                  </div>
                )}
              </div>
            </div>
            <CandlestickChart pair="BTC_USDT" height={220} threshold={btcEvent.threshold} deadline={btcEvent.deadline} />
          </div>
        </div>
      )}

      {/* Event cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((evt) => {
          const { _props: props, _diff: diff, _liqEstimate: liq, _spreadPct: spread, question, deadline, opening_price, threshold, ai_comments } = evt;
          if (!props) return null;
          const current = opening_price || 0;
          const diffColor = diff !== null ? (diff >= 0 ? '#34d399' : '#f43f5e') : '#64748b';
          const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
          const isExpired = deadline ? new Date(deadline) < new Date() : false;
          const questionTr = translateQuestion(question);
          const comments = ai_comments || [];

          return (
            <div key={evt.id}
              className="group relative rounded-2xl border overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(145deg, #0c0f1e 0%, #0e1225 50%, #0c0f1e 100%)',
                borderColor: `${props.accent}18`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${props.accent}08`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${props.accent}45`;
                e.currentTarget.style.boxShadow = `0 0 40px ${props.accent}18, 0 8px 40px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${props.accent}18`;
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${props.accent}08`;
              }}>

              {/* Top neon bar */}
              <div style={{
                height: '3px',
                background: `linear-gradient(90deg, transparent, ${props.accent}, transparent)`,
                boxShadow: `0 0 12px ${props.accent}80`,
              }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold" style={{ color: props.accent }}>{props.icon}</span>
                    <span className="text-sm font-black text-white">{props.symbol}</span>
                    {liq && (
                      <span className="text-[9px] text-slate-600">
                        · Likidite {formatLiq(liq)}
                      </span>
                    )}
                  </div>
                  {isExpired ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}>
                      ⏰ SÜRE DOLDI
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                      style={{ background: `${props.accent}12`, color: props.accent, border: `1px solid ${props.accent}25` }}>
                      ⚡ AKTİF
                    </span>
                  )}
                </div>

                {/* Question */}
                <p className="text-[11px] text-slate-300 leading-snug mb-3 line-clamp-2 font-medium">
                  {questionTr}
                </p>

                {/* Prices */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Açılış</div>
                    <div className="text-lg font-black text-white tabular-nums">
                      {opening_price ? `$${Number(opening_price).toFixed(props.decimals)}` : '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">→</span>
                    <span className="text-lg font-black tabular-nums" style={{ color: props.accent, textShadow: `0 0 15px ${props.accent}60` }}>
                      {threshold ? `$${Number(threshold).toFixed(props.decimals)}` : '—'}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Fark</div>
                    <div className="text-lg font-black tabular-nums" style={{ color: diffColor, textShadow: `0 0 15px ${diffColor}60` }}>
                      {diff !== null ? `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)}` : '—'}
                    </div>
                  </div>
                </div>

                {/* AI Comments */}
                {comments.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {comments.slice(0, 2).map((c, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[9px] leading-snug"
                        style={{ color: c.sentiment === 'bullish' ? '#34d399' : c.sentiment === 'bearish' ? '#f43f5e' : '#94a3b8' }}>
                        <span className="shrink-0 mt-0.5">
                          {c.sentiment === 'bullish' ? '📈' : c.sentiment === 'bearish' ? '📉' : '💬'}
                        </span>
                        <span className="italic">{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* EVET / HAYIR buttons */}
                {!isExpired && (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.96]"
                      style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: '#ffffff',
                        boxShadow: '0 0 20px rgba(34,197,94,0.35)',
                      }}>
                      ✓ EVET
                    </button>
                    <button className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.96]"
                      style={{
                        background: 'rgba(244,63,94,0.1)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        color: '#f43f5e',
                        boxShadow: '0 0 12px rgba(244,63,94,0.08)',
                      }}>
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
