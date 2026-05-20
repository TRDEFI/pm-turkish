'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min — events refresh with scheduled runs

// ─── Supabase-backed Weather Events ────────────────────────────────────
function SupabaseWeatherEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const WEATHER_ICONS = {
    113: { emoji: '☀️',  label: 'Güneşli' },
    116: { emoji: '⛅',  label: 'Parçalı Bulutlu' },
    119: { emoji: '☁️',  label: 'Bulutlu' },
    122: { emoji: '☁️',  label: 'Kapalı' },
    143: { emoji: '🌫️', label: 'Sisli' },
    176: { emoji: '🌦️', label: 'Hafif Yağmur' },
    179: { emoji: '🌨️', label: 'Hafif Kar' },
    200: { emoji: '⛈️', label: 'Gök Gürültülü' },
    227: { emoji: '🌨️', label: 'Kar Fırtınası' },
    230: { emoji: '❄️',  label: 'Kar Fırtınası' },
    260: { emoji: '🌫️', label: 'Yoğun Sis' },
    266: { emoji: '🌧️', label: 'Çiseleme' },
    293: { emoji: '🌦️', label: 'Hafif Yağmur' },
    296: { emoji: '🌧️', label: 'Hafif Yağmur' },
    299: { emoji: '🌧️', label: 'Orta Yağmur' },
    302: { emoji: '🌧️', label: 'Yağmurlu' },
    305: { emoji: '🌧️', label: 'Şiddetli Yağmur' },
    308: { emoji: '🌧️', label: 'Çok Şiddetli Yağmur' },
    323: { emoji: '🌨️', label: 'Hafif Kar' },
    326: { emoji: '🌨️', label: 'Hafif Kar' },
    329: { emoji: '❄️',  label: 'Kar' },
    332: { emoji: '❄️',  label: 'Kar' },
    338: { emoji: '❄️',  label: 'Yoğun Kar' },
    353: { emoji: '🌦️', label: 'Hafif Sağanak' },
    356: { emoji: '🌧️', label: 'Sağanak' },
    359: { emoji: '🌧️', label: 'Şiddetli Sağanak' },
    386: { emoji: '⛈️', label: 'Gök Gürültülü Sağanak' },
    389: { emoji: '⛈️', label: 'Gök Gürültülü Yağmur' },
    392: { emoji: '❄️',  label: 'Gök Gürültülü Kar' },
  };

  function getIcon(code) { return WEATHER_ICONS[code] || { emoji: '🌡️', label: 'Bilinmiyor' }; }

  // Extract city name from question (e.g. "İstanbul yarın 15°C'yi geçer mi?" → "İstanbul")
  function getCityFromQuestion(q) {
    if (!q) return 'Şehir';
    const match = q.match(/^(İstanbul|Ankara|İzmir|Samsun|Antalya|Trabzon|Bursa|Adana)/);
    return match ? match[1] : 'Şehir';
  }

  function formatDeadline(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch('/.netlify/functions/fetch-events?category=hava');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEvents(Array.isArray(data) ? data : []);
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
      <div className="w-8 h-8 rounded-full border-[2px] border-slate-800 border-t-sky-400 animate-spin" />
      <p className="text-slate-500 text-xs">Hava olayları yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-8 text-xs text-slate-500">Yüklenemedi: {error} <button onClick={() => load(false)} className="text-sky-400 ml-2">↻</button></div>
  );

  if (events.length === 0) return (
    <div className="text-center py-12">
      <p className="text-3xl mb-2">🌤️</p>
      <p className="text-slate-400 text-sm">Yarın için hava tahminleri oluşturuluyor...</p>
      <p className="text-slate-600 text-xs mt-1">Her gün 00:00'da OpenRouter AI tarafından üretilir</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-50" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${fetching ? 'bg-sky-300' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgo()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">{events.length} şehir · OpenRouter AI</span>
        </div>
        <button onClick={() => load(false)} disabled={fetching} className="text-xs text-slate-600 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-40">↻</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((evt) => {
          const city = getCityFromQuestion(evt.question);
          const threshold = evt.threshold || 15;
          const currentTemp = evt.opening_price;
          const icon = getIcon(evt.weatherCode || 113);
          const deadline = formatDeadline(evt.deadline);

          return (
            <div key={evt.id}
              className="group relative bg-[#0f1420] rounded-xl border border-white/5 hover:border-sky-500/30 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-400 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2.5xl leading-none" style={{ animation: 'soft-bounce 3s ease-in-out infinite' }}>{icon.emoji}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{city}</h3>
                      <p className="text-[10px] text-sky-400/60">{icon.label}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600">{deadline}</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mb-3 line-clamp-2">
                  {evt.question}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Şu an</p>
                    <p className="text-lg font-bold text-white tabular-nums">
                      {currentTemp ? `${currentTemp}°C` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hedef</p>
                    <p className="text-lg font-bold text-sky-400 tabular-nums">{threshold}°C</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 active:scale-[0.97] transition-all">
                    ✓ EVET
                  </button>
                  <button className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-[0.97] transition-all">
                    ✗ HAYIR
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes soft-bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)} }`}</style>
    </div>
  );
}

// ─── Tab Config ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'hava',        label: 'Hava',        emoji: '🌤️', Component: SupabaseWeatherEvents },
  { key: 'kripto-gun',  label: 'Kripto Gün',  emoji: '📈', component: null },
  { key: 'kripto-5dk',  label: 'Kripto 5dk',  emoji: '⚡', component: null },
  { key: 'doviz',       label: 'Döviz',       emoji: '💱', component: null },
  { key: 'olusturulan', label: 'Oluşturulan', emoji: '🔮', component: null },
];

// Lazy-load tab components to avoid circular deps
let _cd, _c5, _fx, _es;
function getComponent(key) {
  if (key === 'kripto-gun') {
    if (!_cd) _cd = require('./CryptoDailyEvents').default;
    return _cd;
  }
  if (key === 'kripto-5dk') {
    if (!_c5) _c5 = require('./Crypto5minEvents').default;
    return _c5;
  }
  if (key === 'doviz') {
    if (!_fx) _fx = require('./ForexEvents').default;
    return _fx;
  }
  if (key === 'olusturulan') {
    if (!_es) _es = require('./EventsSection').default;
    return _es;
  }
  return null;
}

const TAB_META = {
  'hava':       { accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)', label: 'Hava', emoji: '🌤️' },
  'kripto-gun': { accent: '#fbbf24', glow: 'rgba(251,191,36,0.15)', label: 'Kripto Gün', emoji: '📈' },
  'kripto-5dk': { accent: '#f97316', glow: 'rgba(249,115,22,0.15)', label: 'Kripto 5dk', emoji: '⚡' },
  'doviz':      { accent: '#34d399', glow: 'rgba(52,211,153,0.15)', label: 'Döviz', emoji: '💱' },
  'olusturulan':{ accent: '#a78bfa', glow: 'rgba(167,139,250,0.15)', label: 'Oluşturulan', emoji: '🔮' },
};

export default function GeneratedEventsSection() {
  const [activeTab, setActiveTab] = useState('hava');
  const meta = TAB_META[activeTab] || TAB_META['hava'];

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(tab => {
          const m = TAB_META[tab.key] || { accent: '#818cf8', glow: 'rgba(129,140,248,0.1)' };
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 min-w-[4rem] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border"
              style={{
                background: isActive ? m.glow : 'rgba(255,255,255,0.03)',
                borderColor: isActive ? `${m.accent}40` : 'rgba(255,255,255,0.06)',
                color: isActive ? m.accent : 'rgba(255,255,255,0.4)',
                boxShadow: isActive ? `0 0 20px ${m.accent}20, inset 0 1px 0 rgba(255,255,255,0.05)` : 'none',
                textShadow: isActive ? `0 0 20px ${m.accent}60` : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'hava' && <SupabaseWeatherEvents />}
      {(activeTab === 'kripto-gun') && (() => {
        const C = getComponent('kripto-gun');
        return C ? <C /> : null;
      })()}
      {(activeTab === 'kripto-5dk') && (() => {
        const C = getComponent('kripto-5dk');
        return C ? <C /> : null;
      })()}
      {(activeTab === 'doviz') && (() => {
        const C = getComponent('doviz');
        return C ? <C /> : null;
      })()}
      {(activeTab === 'olusturulan') && (() => {
        const C = getComponent('olusturulan');
        return C ? <C /> : null;
      })()}
    </div>
  );
}
