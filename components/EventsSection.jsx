'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 30000; // 30 seconds

const CATEGORY_EMOJIS = {
  'hava-durumu': '🌤️',
  'ekonomi': '💰',
  'spor': '⚽',
  'gundem': '📰',
  'teknoloji': '💻',
  'kultur-sanat': '🎭',
  'genel': '🌐',
};

const CATEGORY_NAMES = {
  'hava-durumu': 'Hava Durumu',
  'ekonomi': 'Ekonomi',
  'spor': 'Spor',
  'gundem': 'Gündem',
  'teknoloji': 'Teknoloji',
  'kultur-sanat': 'Kültür & Sanat',
  'genel': 'Genel',
};

export default function EventsSection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/fetch-events');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        setLastUpdate(Date.now());
      }
    } catch (err) {
      console.error('[EventsSection]', err);
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadEvents(false); }, [loadEvents]);
  useEffect(() => {
    const timer = setInterval(() => loadEvents(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadEvents]);

  const formatDeadline = (deadline) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return 'Süre doldu';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${mins}dk kaldı`;
  };

  const timeAgo = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 10) return 'Az önce';
    if (s < 60) return `${s}s önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) {
    return (
      <div className="mt-10">
        <h2 className="text-lg font-bold text-slate-100 mb-4">🔮 Oluşturulan Olaylar</h2>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-[3px] border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs">Yapay zeka olaylar oluşturuluyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-100">🔮 Oluşturulan Olaylar</h2>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            LLM ile otomatik
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {fetching ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            )}
          </span>
          <span className="text-xs text-slate-500">{timeAgo()}</span>
          <button onClick={() => loadEvents(false)} disabled={fetching}
            className="text-xs px-2 py-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-slate-800/50 rounded-xl p-6 text-center mb-4 border border-slate-700/30">
          <p className="text-slate-400 text-sm mb-2">Henüz otomatik olay oluşturulmadı</p>
          <p className="text-slate-500 text-xs">İlk olaylar 15 dakika içinde oluşturulacak...</p>
        </div>
      )}

      {!error && events.length === 0 && (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/30">
          <p className="text-3xl mb-3">🤖</p>
          <p className="text-slate-300 text-sm font-medium mb-1">Yapay zeka olaylar hazırlıyor</p>
          <p className="text-slate-500 text-xs">Google Trends ve haber kaynakları taranıyor...</p>
        </div>
      )}

      {!error && events.length > 0 && (
        <div className="space-y-3">
          {events.map(event => {
            const emoji = CATEGORY_EMOJIS[event.category] || '🌐';
            const catName = CATEGORY_NAMES[event.category] || event.category;
            const sources = event.ref_links || [];

            return (
              <div key={event.id}
                className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 hover:border-slate-600/60 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {catName}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                      {event.question}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {formatDeadline(event.deadline)}
                    </div>
                  </div>
                </div>

                {/* Reference Links */}
                {sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/30">
                    <p className="text-[10px] text-slate-500 mb-1">📎 Kaynaklar:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sources.slice(0, 3).map((src, i) => (
                        <a key={i} href={src.url || '#'} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:text-blue-300 underline truncate max-w-[200px]">
                          {src.title || src.url || 'Kaynak'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
