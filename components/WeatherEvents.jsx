'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

// ─── Dynamic date helpers ───────────────────────────────────────────────
function tomorrowDate() {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function formatDateTR(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeRange(start, end) {
  return `${String(start).padStart(2,'0')}:00–${String(end).padStart(2,'0')}:00`;
}

// ─── City templates — date is computed at runtime (tomorrow) ─────────────
function buildTemplates() {
  const t = tomorrowDate();
  return [
    { city: 'İstanbul', startHour: 7, endHour: 19, threshold: 15 },
    { city: 'Ankara',   startHour: 7, endHour: 19, threshold: 12 },
    { city: 'İzmir',    startHour: 7, endHour: 19, threshold: 18 },
    { city: 'Samsun',   startHour: 7, endHour: 19, threshold: 15 },
    { city: 'Antalya',  startHour: 7, endHour: 19, threshold: 20 },
    { city: 'Trabzon',  startHour: 7, endHour: 19, threshold: 15 },
    { city: 'Bursa',    startHour: 7, endHour: 19, threshold: 15 },
    { city: 'Adana',    startHour: 7, endHour: 19, threshold: 20 },
  ].map(tmpl => ({ ...tmpl, date: t })); // inject dynamic date
}

// ─── Weather code → emoji/label ─────────────────────────────────────────
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

function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || { emoji: '🌡️', label: 'Bilinmiyor' };
}

function getEnglishCity(city) {
  const map = {
    'İstanbul': 'Istanbul', 'Ankara': 'Ankara', 'İzmir': 'Izmir',
    'Samsun': 'Samsun', 'Antalya': 'Antalya', 'Trabzon': 'Trabzon',
    'Bursa': 'Bursa', 'Adana': 'Adana',
  };
  return map[city] || city;
}

async function fetchWeather(cityEn) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(cityEn)}?format=j1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch { return null; }
}

/* ─── Vote Modal ─── */
function VoteModal({ city, question, choice, threshold, onClose }) {
  const overlayRef = useRef(null);
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#13162a] rounded-2xl border border-sky-500/20 w-[380px] max-w-[95vw] overflow-hidden shadow-2xl shadow-sky-500/10">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="text-sm font-semibold text-white">{city}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-5 pt-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            choice === 'EVET' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {choice === 'EVET' ? '✓ EVET' : '✗ HAYIR'}
          </div>
        </div>
        <div className="px-5 pt-3 pb-4">
          <p className="text-xs text-slate-300 leading-snug">{question}</p>
          <div className="mt-2 text-lg font-bold text-white">{threshold}°C</div>
          <div className="text-[10px] text-slate-500">Hedef sıcaklık</div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
            İptal
          </button>
          <button
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:opacity-90"
            style={{ background: choice === 'EVET' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            {choice === 'EVET' ? '🟢 Tahmini Onayla' : '🔴 Tahmini Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── WeatherCard ─── */
function WeatherCard({ event }) {
  const { city, currentTemp, threshold, diff, weatherIcon, dateDisplay, timeRange, hasData } = event;
  const [modal, setModal] = useState(null);

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-orange-400' : 'text-blue-400') : 'text-slate-600';
  const progressPct = hasData ? Math.min(100, Math.max(5, (currentTemp / (threshold * 1.5)) * 100)) : 5;
  const isAbove = hasData && currentTemp >= threshold;

  return (
    <>
    <div className="group relative bg-[#0f1420] rounded-xl border border-white/5 hover:border-sky-500/30 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5">
      {/* Top color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-400 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none" style={{ animation: 'soft-bounce 3s ease-in-out infinite' }}>
              {weatherIcon.emoji}
            </span>
            <div>
              <h3 className="text-[12px] font-bold text-white leading-[1.35]">
                {city}
              </h3>
              <p className="text-[10px] text-sky-400/70 mt-0.5">{weatherIcon.label}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 mb-0.5">{dateDisplay}</div>
            <div className="text-[10px] text-slate-600">{timeRange}</div>
          </div>
        </div>

        {/* Question */}
        <p className="text-[11px] text-slate-400 leading-snug mb-4">
          Yarın {timeRange} arası en yüksek <span className="text-white font-semibold">{threshold}°C</span>'yi geçer mi?
        </p>

        {/* Temp row */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Şu an</p>
            <p className={`text-2xl font-bold tabular-nums ${hasData ? 'text-white' : 'text-slate-600'}`}
              style={hasData ? { animation: 'pulse-subtle 2s ease-in-out infinite' } : {}}>
              {hasData ? `${currentTemp}°C` : '—'}
            </p>
          </div>

          {diff !== null && (
            <div className="flex flex-col items-center px-3">
              <span className="text-[9px] text-slate-500 mb-1">Fark</span>
              <span className={`text-lg font-bold ${diffColor}`}>
                {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {diffSign}{diff}°
              </span>
            </div>
          )}

          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Hedef</p>
            <p className="text-2xl font-bold text-sky-400 tabular-nums">{threshold}°C</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progressPct}%`,
                background: isAbove
                  ? 'linear-gradient(90deg, #f97316, #ef4444)'
                  : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              }} />
          </div>
        </div>

        {/* EVET / HAYIR */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModal({ choice: 'EVET' })}
            className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 active:scale-[0.97] transition-all">
            ✓ EVET
          </button>
          <button
            onClick={() => setModal({ choice: 'HAYIR' })}
            className="py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-[0.97] transition-all">
            ✗ HAYIR
          </button>
        </div>
      </div>
    </div>

    {modal && (
      <VoteModal
        city={city}
        question={`Yarın ${timeRange} arası en yüksek ${threshold}°C'yi geçer mi?`}
        choice={modal.choice}
        threshold={threshold}
        onClose={() => setModal(null)}
      />
    )}
    </>
  );
}

/* ─── Main ─── */
export default function WeatherEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const bounceStyle = (
    <style>{`
      @keyframes soft-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      @keyframes pulse-subtle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.75; }
      }
    `}</style>
  );

  const loadWeather = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      // Build templates with fresh dates on every load
      const templates = buildTemplates();

      const results = await Promise.all(
        templates.map(async (t) => {
          const cityEn = getEnglishCity(t.city);
          const data = await fetchWeather(cityEn);
          let currentTemp = null, weatherCode = null;
          let weatherIcon = { emoji: '🌡️', label: '...' };
          if (data?.current_condition?.[0]) {
            currentTemp = parseFloat(data.current_condition[0].temp_C);
            weatherCode = parseInt(data.current_condition[0].weatherCode);
            weatherIcon = getWeatherIcon(weatherCode);
          }
          const diff = currentTemp !== null ? +(currentTemp - t.threshold).toFixed(1) : null;

          return {
            ...t,
            currentTemp,
            diff,
            weatherIcon,
            weatherCode,
            dateDisplay: formatDateTR(t.date),
            timeRange: formatTimeRange(t.startHour, t.endHour),
            hasData: currentTemp !== null,
          };
        })
      );

      setEvents(results);
      setLastUpdate(Date.now());
    } finally { setLoading(false); setFetching(false); }
  }, []);

  useEffect(() => { loadWeather(false); }, [loadWeather]);
  useEffect(() => {
    const t = setInterval(() => loadWeather(true), REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [loadWeather]);

  const timeAgoStr = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    if (s < 60) return `${s}sn önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-800 border-t-sky-400 animate-spin" />
        <p className="text-slate-400 text-sm">Hava durumu yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      {bounceStyle}

      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'bg-sky-300 animate-pulse' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgoStr()}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-600">8 şehir · wttr.in</span>
        </div>
        <button onClick={() => loadWeather(false)} disabled={fetching}
          className="text-xs px-3 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-40">
          ↻ Yenile
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((evt) => (
          <WeatherCard key={evt.city} event={evt} />
        ))}
      </div>
    </div>
  );
}
