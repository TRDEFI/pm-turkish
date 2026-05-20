'use client';

import { useState, useEffect, useCallback } from 'react';
import { translateQuestion } from '../lib/autoTranslate';

const REFRESH_INTERVAL = 30000;
const STORAGE_KEY = 'pmturkish_votes';

const CATEGORY_EMOJIS = {
  'hava-durumu': '🌤️', 'ekonomi': '💰', 'spor': '⚽', 'gundem': '📰',
  'teknoloji': '💻', 'kultur-sanat': '🎭', 'kripto-5dk': '⚡', 'kripto-gun': '📈',
  'genel': '🌐',
};

const CATEGORY_NAMES = {
  'hava-durumu': 'Hava Durumu', 'ekonomi': 'Ekonomi', 'spor': 'Spor',
  'gundem': 'Gündem', 'teknoloji': 'Teknoloji', 'kultur-sanat': 'Kültür & Sanat',
  'kripto-5dk': 'Kripto 5dk', 'kripto-gun': 'Kripto Gün', 'genel': 'Genel',
};

const CATEGORY_COLORS = {
  'hava-durumu': '#38bdf8', 'ekonomi': '#fbbf24', 'spor': '#22c55e',
  'gundem': '#a78bfa', 'teknoloji': '#38bdf8', 'kultur-sanat': '#f472b6',
  'kripto-5dk': '#f97316', 'kripto-gun': '#fbbf24', 'genel': '#818cf8',
};

function getStoredVotes() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setStoredVote(eventId, choice) {
  const votes = getStoredVotes();
  votes[eventId] = choice;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

async function submitVote(eventId, choice) {
  const res = await fetch('/.netlify/functions/submit-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, choice }),
  });
  if (!res.ok) throw new Error('Vote failed');
  setStoredVote(eventId, choice);
  return true;
}

export default function EventsSection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [votedEvents, setVotedEvents] = useState({});
  const [votingIn, setVotingIn] = useState(null);

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    setError(null);
    try {
      // Include vote counts
      const res = await fetch('/.netlify/functions/fetch-events?past=false&includeVotes=true');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data)) {
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

  useEffect(() => {
    setVotedEvents(getStoredVotes());
    loadEvents(false);
  }, [loadEvents]);

  useEffect(() => {
    const timer = setInterval(() => loadEvents(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadEvents]);

  const handleVote = useCallback(async (eventId, choice) => {
    if (votedEvents[eventId]) return;
    setVotingIn(eventId);
    try {
      await submitVote(eventId, choice);
      setVotedEvents(prev => ({ ...prev, [eventId]: choice }));
      // Refresh to get updated vote counts
      await loadEvents(true);
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVotingIn(null);
    }
  }, [votedEvents, loadEvents]);

  const formatDeadline = (deadline) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return 'Süre doldu';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}g ${hours % 24}s kaldı`;
    return hours > 0 ? `${hours}s ${mins}dk kaldı` : `${mins}dk kaldı`;
  };

  const timeAgo = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 10) return 'Az önce';
    if (s < 60) return `${s}s önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) return (
    <div className="mt-10">
      <h2 className="text-lg font-bold text-slate-100 mb-4">🔮 Oluşturulan Olaylar</h2>
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-slate-800 border-t-purple-500 rounded-full animate-spin" />
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 20px rgba(168,85,247,0.4)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
        </div>
        <p className="text-slate-400 text-sm animate-pulse">Yapay zeka olaylar oluşturuluyor...</p>
      </div>
    </div>
  );

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>
            <span className="text-lg">🔮</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Oluşturulan Olaylar</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">LLM ile otomatik</span>
              <span className="text-[10px] text-slate-700">·</span>
              <span className="text-[10px] text-slate-600">{events.length} olay</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {fetching
                ? <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                : <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
                    style={{ boxShadow: '0 0 6px #34d399' }} />}
            </span>
            <span className="text-xs text-slate-500">{timeAgo()}</span>
          </div>
          <button onClick={() => loadEvents(false)} disabled={fetching}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            ↻
          </button>
        </div>
      </div>

      {/* Empty / Error states */}
      {error && (
        <div className="rounded-2xl p-8 text-center border" style={{
          background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)',
        }}>
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-rose-400 text-sm mb-1">Yüklenemedi</p>
          <p className="text-slate-500 text-xs mb-3">{error}</p>
          <button onClick={() => loadEvents(false)}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
            ↻ Tekrar Dene
          </button>
        </div>
      )}

      {!error && events.length === 0 && (
        <div className="rounded-2xl p-10 text-center border" style={{
          background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)',
        }}>
          <div className="text-5xl mb-4 animate-bounce">🤖</div>
          <p className="text-slate-300 text-sm font-semibold mb-1">Yapay zeka olaylar hazırlıyor</p>
          <p className="text-slate-500 text-xs">Google Trends ve haber kaynakları taranıyor...</p>
        </div>
      )}

      {/* Events list */}
      {!error && events.length > 0 && (
        <div className="space-y-3">
          {events.map(event => {
            const emoji = CATEGORY_EMOJIS[event.category] || '🌐';
            const catName = CATEGORY_NAMES[event.category] || event.category;
            const accent = CATEGORY_COLORS[event.category] || '#818cf8';
            const sources = event.references || [];
            const userVote = votedEvents[event.id];
            const isVoting = votingIn === event.id;
            const isExpired = event.deadline ? new Date(event.deadline) < new Date() : false;
            const voteData = event._votes || { evet: 0, hayir: 0 };
            const totalVotes = voteData.evet + voteData.hayir;
            const evetPct = totalVotes > 0 ? (voteData.evet / totalVotes * 100) : 50;
            const questionTr = translateQuestion(event.question);

            return (
              <div key={event.id}
                className="group relative rounded-2xl border overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(145deg, #0c0f1e, #0e1225)',
                  borderColor: `${accent}18`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${accent}08`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${accent}35`;
                  e.currentTarget.style.boxShadow = `0 0 30px ${accent}12, 0 8px 40px rgba(0,0,0,0.4)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${accent}18`;
                  e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${accent}08`;
                }}>

                {/* Top glowing accent bar */}
                <div style={{
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                  boxShadow: `0 0 8px ${accent}60`,
                }} />

                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">{emoji}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{
                            background: `${accent}12`,
                            color: accent,
                            border: `1px solid ${accent}25`,
                          }}>
                          {catName}
                        </span>
                      </div>
                      <h3 className="text-[13px] font-semibold text-slate-100 leading-snug"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                        {questionTr}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-medium px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {formatDeadline(event.deadline)}
                      </div>
                      {isExpired && (
                        <div className="text-[10px] text-amber-400 mt-0.5 font-bold">Süre doldu</div>
                      )}
                    </div>
                  </div>

                  {/* Vote section */}
                  <div className="mb-3">
                    {totalVotes > 0 ? (
                      /* Vote tally bar */
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-emerald-400 font-bold" style={{ textShadow: '0 0 10px rgba(52,211,153,0.5)' }}>
                            ✓ EVET
                          </span>
                          <span className="text-slate-500">{totalVotes} oy</span>
                          <span className="text-rose-400 font-bold" style={{ textShadow: '0 0 10px rgba(244,63,94,0.5)' }}>
                            HAYIR ✗
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="h-full flex items-center justify-end px-2 transition-all duration-700"
                            style={{
                              width: `${evetPct}%`,
                              background: `linear-gradient(90deg, rgba(52,211,153,0.7), #34d399)`,
                              boxShadow: '0 0 8px rgba(52,211,153,0.5)',
                            }}>
                            {evetPct > 20 && (
                              <span className="text-[8px] font-black text-white whitespace-nowrap">
                                {voteData.evet}
                              </span>
                            )}
                          </div>
                          <div className="h-full flex items-center justify-end px-2 transition-all duration-700"
                            style={{
                              width: `${100 - evetPct}%`,
                              background: `linear-gradient(90deg, rgba(244,63,94,0.7), #f43f5e)`,
                              boxShadow: '0 0 8px rgba(244,63,94,0.5)',
                            }}>
                            {100 - evetPct > 20 && (
                              <span className="text-[8px] font-black text-white whitespace-nowrap">
                                {voteData.hayir}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] mt-0.5">
                          <span className="text-emerald-400">{evetPct.toFixed(0)}%</span>
                          <span className="text-rose-400">{(100 - evetPct).toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 mb-2">Henüz oy yok — ilk oy veren sen ol!</div>
                    )}

                    {/* Vote buttons */}
                    {!isExpired && (
                      <div className="flex gap-2">
                        {userVote ? (
                          <div className={`flex-1 py-2.5 rounded-xl text-center text-xs font-black border ${
                            userVote === 'EVET'
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                          }`}
                            style={{
                              background: userVote === 'EVET' ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
                              borderColor: userVote === 'EVET' ? 'rgba(52,211,153,0.25)' : 'rgba(244,63,94,0.25)',
                              boxShadow: userVote === 'EVET' ? '0 0 15px rgba(52,211,153,0.15)' : '0 0 15px rgba(244,63,94,0.15)',
                            }}>
                            ✓ {userVote} — Oylanmış
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleVote(event.id, 'EVET')}
                              disabled={isVoting}
                              className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50"
                              style={{
                                background: 'rgba(52,211,153,0.08)',
                                border: '1px solid rgba(52,211,153,0.2)',
                                color: '#34d399',
                                boxShadow: '0 0 12px rgba(52,211,153,0.08)',
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 20px rgba(52,211,153,0.2)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 12px rgba(52,211,153,0.08)'}>
                              {isVoting ? '...' : '✓ EVET'}
                            </button>
                            <button
                              onClick={() => handleVote(event.id, 'HAYIR')}
                              disabled={isVoting}
                              className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50"
                              style={{
                                background: 'rgba(244,63,94,0.08)',
                                border: '1px solid rgba(244,63,94,0.2)',
                                color: '#f43f5e',
                                boxShadow: '0 0 12px rgba(244,63,94,0.08)',
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 20px rgba(244,63,94,0.2)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 12px rgba(244,63,94,0.08)'}>
                              {isVoting ? '...' : '✗ HAYIR'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Source links */}
                  {sources.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-[9px] text-slate-600 mb-1.5 mt-2 uppercase tracking-wider">📎 Kaynaklar</p>
                      <div className="flex flex-wrap gap-2">
                        {sources.slice(0, 3).map((src, i) => (
                          <a key={i} href={src.url || '#'} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors truncate max-w-[200px] flex items-center gap-1"
                            style={{ textShadow: '0 0 10px rgba(56,189,248,0.3)' }}>
                            <span className="opacity-50">↗</span>
                            {src.title || 'Kaynak'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
