'use client';

import { useState, useEffect, useCallback } from 'react';
import BidCard from './BidCard';
import { t } from '../lib/translations';

const REFRESH_INTERVAL = 8000;

export default function MarketsGrid() {
  const [markets, setMarkets] = useState([]);
  const [prevMarkets, setPrevMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const initialLoad = useCallback(async () => setLoading(true), []);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Extract unique event titles for display as pills
  const eventTitles = [];
  const seenEvents = new Set();
  markets.forEach(m => {
    const title = m._eventTitle || m._eventKey || 'Genel';
    if (title && !seenEvents.has(title)) {
      seenEvents.add(title);
      eventTitles.push(title);
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
        <p className="text-slate-400 text-sm">Piyasa verileri yüzkleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
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
        </div>
        <button onClick={() => loadMarkets(false)} disabled={fetching}
          className={`text-xs px-2.5 py-1 rounded-md transition-all ${fetching ? 'text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          ↻ Yenile
        </button>
      </div>

      {/* Event topic pills showing diversity */}
      {eventTitles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {eventTitles.slice(0, 8).map(title => (
            <span key={title} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800/60 text-slate-400 border border-slate-700/30">
              {title}
            </span>
          ))}
          {eventTitles.length > 8 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-500">+{eventTitles.length - 8}</span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-rose-950/30 border border-rose-800/30 rounded-xl p-6 text-center mb-6">
          <p className="text-rose-400 mb-3">{error}</p>
          <button onClick={() => loadMarkets(false)} className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm text-white">Yeniden Dene</button>
        </div>
      )}

      {!error && markets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {markets.map(market => (
            <BidCard key={market.id} market={market} priceChange={getPriceChange(market)} />
          ))}
        </div>
      )}

      {!error && markets.length === 0 && (
        <div className="text-center py-16"><p className="text-slate-500">Pazar bulunamadı</p></div>
      )}
    </div>
  );
}
