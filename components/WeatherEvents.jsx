'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 dk

// City templates
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

function formatHour12(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:00 ${suffix}`;
}

// Weather codes from wttr.io → emoji + description
const WEATHER_ICONS = {
  113: { emoji: '☀️', label: 'Güneşli' },
  116: { emoji: '⛅', label: 'Parçalı Bulutlu' },
  119: { emoji: '☁️', label: 'Bulutlu' },
  122: { emoji: '☁️', label: 'Kapalı' },
  143: { emoji: '🌫️', label: 'Sisli' },
  176: { emoji: '🌦️', label: 'Hafif Yağmur' },
  179: { emoji: '🌨️', label: 'Hafif Kar' },
  182: { emoji: '🌨️', label: 'Kar' },
  185: { emoji: '🌧️', label: 'Dondurucu Yağmur' },
  200: { emoji: '⛈️', label: 'Gök Gürültülü' },
  227: { emoji: '🌨️', label: 'KTipi Fırtına' },
  230: { emoji: '❄️', label: 'Kar Fırtınası' },
  248: { emoji: '🌫️', label: 'Sis' },
  260: { emoji: '🌫️', label: 'Yoğun Sis' },
  263: { emoji: '🌦️', label: 'Hafif Çiseleme' },
  266: { emoji: '🌧️', label: 'Çiseleme' },
  281: { emoji: '🌧️', label: 'Dondurucu Çiseleme' },
  284: { emoji: '🌧️', label: 'Dondurucu Yağmur' },
  293: { emoji: '🌦️', label: 'Hafif Yağmur' },
  296: { emoji: '🌧️', label: 'Hafif Yağmur' },
  299: { emoji: '🌧️', label: 'Orta Yağmur' },
  302: { emoji: '🌧️', label: 'Yağmurlu' },
  305: { emoji: '🌧️', label: 'Şiddetli Yağmur' },
  308: { emoji: '🌧️', label: 'Çok Şiddetli Yağmur' },
  311: { emoji: '🌧️', label: 'Hafif Dondurucu Yağmur' },
  314: { emoji: '🌧️', label: 'Dondurucu Yağmur' },
  317: { emoji: '🌨️', label: 'Hafif Karışık' },
  320: { emoji: '🌨️', label: 'Karışık Yağmur/Kar' },
  323: { emoji: '🌨️', label: 'Hafif Kar' },
  326: { emoji: '🌨️', label: 'Hafif Kar' },
  329: { emoji: '❄️', label: 'Kar' },
  332: { emoji: '❄️', label: 'Kar' },
  335: { emoji: '❄️', label: 'Yoğun Kar' },
  338: { emoji: '❄️', label: 'Yoğun Kar' },
  350: { emoji: '🧊', label: 'Buz Taneleri' },
  353: { emoji: '🌦️', label: 'Hafif Sağanak' },
  356: { emoji: '🌧️', label: 'Sağanak' },
  359: { emoji: '🌧️', label: 'Şiddetli Sağanak' },
  362: { emoji: '🌨️', label: 'Hafif Karlı Sağanak' },
  365: { emoji: '🌨️', label: 'Karlı Sağanak' },
  368: { emoji: '🌨️', label: 'Hafif Kar Fırtınası' },
  371: { emoji: '❄️', label: 'Kar Fırtınası' },
  374: { emoji: '🧊', label: 'Buz Sağanak' },
  377: { emoji: '🧊', label: 'Buz Fırtınası' },
  386: { emoji: '⛈️', label: 'Gök Gürültülü Sağanak' },
  389: { emoji: '⛈️', label: 'Gök Gürültülü Yağmur' },
  392: { emoji: '⛈️', label: 'Gök Gürültülü Kar' },
  395: { emoji: '❄️', label: 'Gök Gürültülü Kar Fırtınası' },
};

function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || { emoji: '🌡️', label: 'Bilinmiyor' };
}

async function fetchWeather(cityEn) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(cityEn)}?format=j1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export default function WeatherEvents() {
  const [events, setEvents] = useState([]);
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

          let currentTemp = null;
          let weatherCode = null;
          let weatherIcon = { emoji: '🌡️', label: '...' };

          if (data?.current_condition?.[0]) {
            currentTemp = parseFloat(data.current_condition[0].temp_C);
            weatherCode = parseInt(data.current_condition[0].weatherCode);
            weatherIcon = getWeatherIcon(weatherCode);
          }

          const diff = currentTemp !== null ? +(currentTemp - t.threshold).toFixed(1) : null;
          const dateDisplay = formatDateTR(t.date);
          const startTime = formatHour12(t.startHour);
          const endTime = formatHour12(t.endHour);
          const wttrUrl = `https://wttr.in/${cityEn}`;

          return {
            ...t,
            cityEn,
            currentTemp,
            diff,
            weatherIcon,
            weatherCode,
            dateDisplay,
            startTime,
            endTime,
            wttrUrl,
            hasData: currentTemp !== null,
          };
        })
      );
      setEvents(results);
      setLastUpdate(Date.now());
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadWeather(false); }, [loadWeather]);
  useEffect(() => {
    const timer = setInterval(() => loadWeather(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadWeather]);

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

      {/* Events grid - 2 per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((evt) => (
          <WeatherCard key={evt.city} event={evt} />
        ))}
      </div>
    </div>
  );
}

function WeatherCard({ event }) {
  const { city, currentTemp, threshold, diff, weatherIcon, dateDisplay, startTime, endTime, wttrUrl, hasData } = event;

  const diffSign = diff !== null ? (diff > 0 ? '+' : '') : '';
  const diffColor = diff !== null ? (diff >= 0 ? 'text-orange-400' : 'text-blue-400') : 'text-slate-600';

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/30 overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/5">
      <div className="p-3.5">
        {/* Bounce animation for weather icon */}
        <style>{`
          @keyframes soft-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
        {/* Weather emoji + Question */}

        <div className="flex items-start gap-2.5 mb-3">
          <span className="text-2xl leading-none mt-0.5" style={{ animation: 'soft-bounce 2s ease-in-out infinite' }}>
            {weatherIcon.emoji}
          </span>
          <h3 className="text-[12.5px] font-semibold text-slate-100 leading-[1.45] line-clamp-2 flex-1">
            {city} — {dateDisplay} {startTime} - {endTime} arasında en yüksek sıcaklık {threshold}°C'yi geçer mi?
          </h3>
        </div>

        {/* Current temp + threshold reference */}
        <div className="flex items-center justify-between mb-3">
          {/* Current temp */}
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Şu an</p>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">
              {hasData ? `${currentTemp}°C` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{weatherIcon.label}</p>
          </div>

          {/* Diff indicator */}
          {diff !== null && (
            <div className="flex flex-col items-center px-3">
              <span className="text-[9px] text-slate-500 mb-0.5">Fark</span>
              <span className={`text-lg font-bold ${diffColor}`}>
                {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {diffSign}{diff}°C
              </span>
            </div>
          )}

          {/* Threshold */}
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Threshold</p>
            <p className="text-2xl font-bold text-sky-400 tabular-nums">
              {threshold}°C
            </p>
            {/* Progress bar showing how close to threshold */}
            {hasData && (
              <div className="w-16 mt-1">
                <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(5, (currentTemp / (threshold * 2)) * 100))}%`,
                      backgroundColor: currentTemp >= threshold ? '#f97316' : '#3b82f6',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EVET / HAYIR buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <button className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.97]">
            ✓ EVET
          </button>
          <button className="py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all active:scale-[0.97]">
            ✗ HAYIR
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <a
            href={wttrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 transition-colors"
          >
            🔗 wttr.in/{city}
          </a>
          <span>{dateDisplay}</span>
        </div>
      </div>
    </div>
  );
}
