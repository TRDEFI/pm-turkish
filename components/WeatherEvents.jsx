'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000;

const TEMPLATES = [
  { city: 'İstanbul', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15 },
  { city: 'Ankara', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 12 },
  { city: 'İzmir', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 18 },
  { city: 'Samsun', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15 },
  { city: 'Antalya', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 20 },
  { city: 'Trabzon', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15 },
  { city: 'Bursa', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15 },
  { city: 'Adana', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 20 },
];

function getEnglishCity(city) {
  const map = {
    'İstanbul': 'Istanbul', 'Ankara': 'Ankara', 'İzmir': 'Izmir',
    'Samsun': 'Samsun', 'Antalya': 'Antalya', 'Trabzon': 'Trabzon',
    'Bursa': 'Bursa', 'Adana': 'Adana',
  };
  return map[city] || city;
}

function formatDateTR(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeRange(start, end) {
  return `${String(start).padStart(2,'0')}:00-${String(end).padStart(2,'0')}:00`;
}

const WEATHER_ICONS = {
  113: { emoji: '☀️', label: 'Güneşli' },
  116: { emoji: '⛅', label: 'Parçalı Bulutlu' },
  119: { emoji: '☁️', label: 'Bulutlu' },
  122: { emoji: '☁️', label: 'Kapalı' },
  143: { emoji: '🌫️', label: 'Sisli' },
  176: { emoji: '🌦️', label: 'Hafif Yağmur' },
  179: { emoji: '🌨️', label: 'Hafif Kar' },
  200: { emoji: '⛈️', label: 'Gök Gürültülü' },
  227: { emoji: '🌨️', label: 'Kar Fırtınası' },
  230: { emoji: '❄️', label: 'Kar Fırtınası' },
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
  329: { emoji: '❄️', label: 'Kar' },
  332: { emoji: '❄️', label: 'Kar' },
  338: { emoji: '❄️', label: 'Yoğun Kar' },
  353: { emoji: '🌦️', label: 'Hafif Sağanak' },
  356: { emoji: '🌧️', label: 'Sağanak' },
  359: { emoji: '🌧️', label: 'Şiddetli Sağanak' },
  386: { emoji: '⛈️', label: 'Gök Gürültülü Sağanak' },
  389: { emoji: '⛈️', label: 'Gök Gürültülü Yağmur' },
  392: { emoji: '❄️', label: 'Gök Gürültülü Kar' },
};

function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || { emoji: '🌡️', label: 'Bilinmiyor' };
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
      <div className="bg-[#1a1d28] rounded-2xl border border-slate-700/50 w-[380px] max-w-[95vw] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50">
          <div className="text-sm font-semibold text-white">{city}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-5 pt-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            choice === 'EVET' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700/50 text-slate-400 text-sm font-medium hover:bg-slate-800/50 transition-colors">
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
  const { city, currentTemp, threshold, diff, weatherIcon, dateDisplay, startTime, endTime, timeRange, hasData } = event;
  const [modal, setModal] = useState(null);

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-orange-400' : 'text-blue-400') : 'text-slate-600';

  // timeRange is "07:00-19:00" for display
  const timeDisplay = timeRange || `${startTime}–${endTime}`;

  return (
    <>
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/30 overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/5">
      <div className="p-3">
        {/* Weather emoji + compact header */}
        <div className="flex gap-2.5">
          <span className="text-2xl leading-tight" style={{ animation: 'soft-bounce 2s ease-in-out infinite' }}>
            {weatherIcon.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-semibold text-slate-100 leading-[1.35] line-clamp-2">
              {city} — {dateDisplay} {timeDisplay} arası en yüksek {threshold}°C'yi geçer mi?
            </h3>
          </div>
        </div>

        {/* Temp row: current + diff + target */}
        <div className="flex items-center justify-between mt-3 mb-2.5">
          {/* Current temp — pulsing */}
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Şu an</p>
            <p className="text-2xl font-bold text-slate-100 tabular-nums animate-pulse">
              {hasData ? `${currentTemp}°C` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{weatherIcon.label}</p>
          </div>

          {/* Diff */}
          {diff !== null && (
            <div className="flex flex-col items-center px-2">
              <span className="text-[9px] text-slate-500 mb-0.5">Fark</span>
              <span className={`text-lg font-bold ${diffColor}`}>
                {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {diffSign}{diff}°C
              </span>
            </div>
          )}

          {/* Hedef */}
          <div className="text-center flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hedef</p>
            <p className="text-2xl font-bold text-sky-400 tabular-nums">{threshold}°C</p>
            {hasData && (
              <div className="w-14 mt-1 mx-auto">
                <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(5, (currentTemp / (threshold * 2)) * 100))}%`,
                      backgroundColor: currentTemp >= threshold ? '#f97316' : '#3b82f6',
                    }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EVET / HAYIR */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => setModal({ choice: 'EVET' })}
            className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.97]">
            ✓ EVET
          </button>
          <button onClick={() => setModal({ choice: 'HAYIR' })}
            className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all active:scale-[0.97]">
            ✗ HAYIR
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <a href={`https://wttr.in/${getEnglishCity(city)}`} target="_blank" rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 transition-colors truncate max-w-[140px]">
            🔗 wttr.in/{city}
          </a>
          <span>{dateDisplay}</span>
        </div>
      </div>
    </div>
    {modal && (
      <VoteModal
        city={city}
        question={`En yüksek sıcaklık ${threshold}°C'yi geçer mi?`}
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

  // Inline CSS for weather icon bounce
  const bounceStyle = (
    <style>{`
      @keyframes soft-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `}</style>
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const loadWeather = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const results = await Promise.all(
        TEMPLATES.map(async (t) => {
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
            ...t, cityEn, currentTemp, diff, weatherIcon, weatherCode,
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
  useEffect(() => { const t = setInterval(() => loadWeather(true), REFRESH_INTERVAL); return () => clearInterval(t); }, [loadWeather]);

  const timeAgoStr = () => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    if (s < 5) return 'Az önce';
    if (s < 60) return `${s}s önce`;
    return `${Math.floor(s / 60)}dk önce`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-700 border-t-sky-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Hava durumu verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      {bounceStyle}
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {fetching && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fetching ? 'animate-pulse bg-sky-300' : 'bg-emerald-500'}`} />
          </span>
          <span className="text-xs text-slate-500">{fetching ? 'Güncelleniyor...' : timeAgoStr()}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-600">{events.length} şehir · wttr.io</span>
        </div>
        <button onClick={() => loadWeather(false)} disabled={fetching}
          className="text-xs px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:text-slate-700">
          ↻ Yenile
        </button>
      </div>

      {/* Grid 2-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((evt) => (
          <WeatherCard key={evt.city} event={evt} />
        ))}
      </div>
    </div>
  );
}
