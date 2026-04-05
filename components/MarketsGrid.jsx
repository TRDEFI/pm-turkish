'use client';

import { useState, useEffect, useCallback } from 'react';
import BidCard from './BidCard';
import { translateEventTitle } from '../lib/autoTranslate';

const REFRESH_INTERVAL = 8000;

// Category definitions matching Polymarket
const CATEGORIES = [
  { key: 'all', label: 'Tümü', emoji: '⭐' },
  { key: 'fifa', label: 'FIFA', emoji: '⚽' },
  { key: 'sports', label: 'Spor', emoji: '🏀' },
  { key: 'politics', label: 'Politika', emoji: '🏛️' },
  { key: 'entertainment', label: 'Eğlence', emoji: '🎬' },
  { key: 'crypto', label: 'Kripto', emoji: '₿' },
  { key: 'science', label: 'Bilim & Teknoloji', emoji: '🔬' },
];

export default function MarketsGrid() {
  const [markets, setMarkets] = useState([]);
  const [prevMarkets, setPrevMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const initialLoad = useCallback(async () => setLoading(true), []);

  const loadMarkets = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/polymarket-proxy');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (Array.isArray(data) && data.length > 0) {
        setPrevMarkets(prev => prev.length > 0 ? prev : []);
        setMarkets(data);
        setLastUpdate(Date.now());
      } else {
        setError('Pazar bulunamadı');
      }
    } catch (err) {
      console.error('[MarketsGrid]', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadMarkets(false); }, [loadMarkets]);
  useEffect(() => {
    const timer = setInterval(() => loadMarkets(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadMarkets]);

  // Filter markets by selected category
  const filteredMarkets = filter === 'all'
    ? markets
    : markets.filter(m => (m._category === filter));

  // Group filtered markets by event title
  const groups = [];
  const seen = new Set();
  filteredMarkets.forEach(m => {
    const title = m._eventTitle || 'Diğer';
    if (title && !seen.has(title)) {
      seen.add(title);
      const groupMarkets = filteredMarkets.filter(x => (x._eventTitle || 'Diğer') === title);
      groups.push({ title, markets: groupMarkets });
    }
  });

  const timeAgoStr = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    if (s < 60) return `${s}s önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  const getPriceChange = (market) => {
    const prev = prevMarkets.find(p => p.id === market.id);
    if (!prev) return [];
    const curr = market._livePrices || JSON.parse(market.outcomePrices || '[]').map(Number);
    const prevP = prev._livePrices || JSON.parse(prev.outcomePrices || '[]').map(Number);
    return curr.map((c, i) => {
      const d = c - (prevP[i] || 0);
      return d > 0.005 ? 'up' : d < -0.005 ? 'down' : 'same';
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Piyasa verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Status bar + Category Row */}
      <div className="mb-6">
        {/* Status + Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {fetching ? (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              )}
            </span>
            <span className="text-xs text-slate-500">
              {fetching ? 'Güncelleniyor...' : `${timeAgoStr()}`}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">{groups.length} konu · {filteredMarkets.length} pazar</span>
          </div>
          <button onClick={() => loadMarkets(false)} disabled={fetching}
            className={`text-xs px-2.5 py-1 rounded-md transition-all ${fetching ? 'text-slate-600 text-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            ↻ Yenile
          </button>
        </div>

        {/* Category Row — Polymarket Style */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            // Count how many markets in this category
            const count = cat.key === 'all'
              ? markets.length
              : markets.filter(m => m._category === cat.key).length;

            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === cat.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.emoji} {cat.label}
                <span className={`ml-1 ${filter === cat.key ? 'text-blue-200' : 'text-slate-600'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/30 border border-rose-800/30 rounded-xl p-6 text-center mb-6">
          <p className="text-rose-400 mb-3">{error}</p>
          <button onClick={() => loadMarkets(false)} className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm text-white">Yeniden Dene</button>
        </div>
      )}

      {!error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.title}>
              {/* Event Section Header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-100">
                  {translateEventTitle(group.title)}
                </h2>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {group.markets.length} pazar
                </span>
              </div>
              
              {/* Cards for this event */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.markets.map(market => (
                  <BidCard key={market.id} market={market} priceChange={getPriceChange(market)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && filteredMarkets.length === 0 && markets.length > 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-2">Bu kategoride pazar bulunamadı</p>
          <button onClick={() => setFilter('all')} className="text-xs text-blue-400 hover:text-blue-300">Tümünü Göster</button>
        </div>
      )}

      {!error && groups.length === 0 && markets.length === 0 && (
        <div className="text-center py-16"><p className="text-slate-500">Pazar bulunamadı</p></div>
      )}
    </div>
  );
}
