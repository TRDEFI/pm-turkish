'use client';

import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 dk

// City templates: { city, date, startHour, endHour, threshold }
// threshold: "max" = max sıcaklık > X? | "avg" = ortalama > X?
const TEMPLATES = [
  { city: 'İstanbul', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15, operator: 'max' },
  { city: 'Ankara', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 12, operator: 'max' },
  { city: 'İzmir', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 18, operator: 'max' },
  { city: 'Samsun', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15, operator: 'max' },
  { city: 'Antalya', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 20, operator: 'max' },
  { city: 'Trabzon', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15, operator: 'max' },
  { city: 'Bursa', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 15, operator: 'max' },
  { city: 'Adana', date: '2026-04-07', startHour: 7, endHour: 19, threshold: 20, operator: 'max' },
];

function getEnglishCity(city) {
  const map = {
    'İstanbul': 'Istanbul',
    'Ankara': 'Ankara',
    'İzmir': 'Izmir',
    'Samsun': 'Samsun',
    'Antalya': 'Antalya',
    'Trabzon': 'Trabzon',
    'Bursa': 'Bursa',
    'Adana': 'Adana',
  };
  return map[city] || city;
}

function formatDateTR(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Fetch weather forecast from wttr.io (JSON format)
async function fetchWeatherForecast(cityEn) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(cityEn)}?format=j1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[Weather] ${cityEn} fetch error:`, e.message);
    return null;
  }
}

// Get max temp for the date range (simplified: today/tomorrow forecast)
function getMaxTemp(data, cityEn) {
  if (!data) return null;
  // wttr.io returns hourly data in weather[0].hourly (today), weather[1].hourly (tomorrow)
  // We need temps between startHour and endHour for the target date
  const allDays = data.weather || [];
  const now = new Date();
  
  // Find the day closest to our target
  for (const day of allDays) {
    const dateStr = day.date; // "2026-04-07"
    const hourly = day.hourly || [];
    
    // Find hours in [startHour, endHour]
    let maxTemp = null;
    for (const h of hourly) {
      const hour = parseInt(h.time) / 100; // wttr returns "0", "100", "200" etc.
      if (hour >= 7 && hour <= 19) {
        const temp = parseFloat(h.tempC);
        if (maxTemp === null || temp > maxTemp) {
          maxTemp = temp;
        }
      }
    }
    if (maxTemp !== null) {
      return maxTemp; // Return first day's max in range
    }
  }
  return null;
}

function getCurrentTemp(data) {
  if (!data) return null;
  try {
    return parseFloat(data.current_condition?.[0]?.temp_C);
  } catch {
    return null;
  }
}

export default function WeatherEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [fetching, setFetching] = useState(false);

  const loadWeather = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    setError(null);
    try {
      const results = await Promise.all(
        TEMPLATES.map(async (t) => {
          const cityEn = getEnglishCity(t.city);
          const data = await fetchWeatherForecast(cityEn);
          const maxTemp = getMaxTemp(data, cityEn);
          const currentTemp = getCurrentTemp(data);
          const wttrUrl = `https://wttr.in/${cityEn}`;
          const dateDisplay = formatDateTR(t.date);
          const timeDisplay = `${t.startHour}:00 - ${t.endHour}:00`;

          let status = 'waiting'; // waiting | above | below
          if (maxTemp !== null) {
            status = maxTemp > t.threshold ? 'above' : 'below';
          }

          return {
            ...t,
            cityEn,
            currentTemp,
            maxTemp,
            status,
            wttrUrl,
            dateDisplay,
            timeDisplay,
          };
        })
      );
      setEvents(results);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('[WeatherEvents]', err);
      setError(err.message);
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

  const sortedEvents = [...events].sort((a, b) => {
    // Show "waiting" (uncertain) first, then above, then below
    const order = { waiting: 0, below: 1, above: 2 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {fetching ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            )}
          </span>
          <span className="text-xs text-slate-500">
            {fetching ? 'Güncelleniyor...' : timeAgoStr()}
          </span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-600">{events.length} şehir · wttr.io</span>
        </div>
        <button onClick={() => loadWeather(false)} disabled={fetching}
          className={`text-xs px-2.5 py-1 rounded-md transition-all ${fetching ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          ↻ Yenile
        </button>
      </div>

      {/* Events grid */}
      <div className="space-y-3">
        {sortedEvents.map((evt) => (
          <WeatherCard key={evt.city} event={evt} />
        ))}
      </div>
    </div>
  );
}

function WeatherCard({ event }) {
  const { city, currentTemp, maxTemp, threshold, operator, dateDisplay, timeDisplay, wttrUrl, status } = event;

  const statusLabel = status === 'above' ? 'ÜSTÜNDE 🌡️' : status === 'below' ? 'ALTINDA ❄️' : 'BİLİNMİYOR ⏳';
  const statusColor = status === 'above'
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : status === 'below'
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  const questionText = `${city} — ${dateDisplay} ${timeDisplay} arasında en yüksek sıcaklık ${threshold}°C'yi geçer mi?`;

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/50 hover:border-sky-400/40 overflow-hidden transition-all duration-200 hover:shadow-lg">
      <div className="p-4">
        {/* Question */}
        <h3 className="text-[13px] font-semibold text-slate-100 leading-[1.4] line-clamp-2 mb-3">
          {questionText}
        </h3>

        {/* Current temp + Forecast */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg p-2.5 bg-sky-500/5">
            <p className="text-[10px] text-slate-500 mb-1">Şu an</p>
            <p className="text-xl font-bold text-sky-400 tabular-nums">
              {currentTemp !== null ? `${currentTemp}°C` : '—'}
            </p>
          </div>
          <div className="rounded-lg p-2.5 bg-orange-500/5">
            <p className="text-[10px] text-slate-500 mb-1">Tahmin Max</p>
            <p className="text-xl font-bold text-orange-400 tabular-nums">
              {maxTemp !== null ? `${maxTemp}°C` : '—'}
            </p>
          </div>
        </div>

        {/* Threshold bar */}
        {maxTemp !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Threshold: <span className="text-slate-300 font-semibold">{threshold}°C</span></span>
              <span className={maxTemp > threshold ? 'text-orange-400' : 'text-blue-400'}>
                {maxTemp > threshold ? '↑ Üstünde' : '↓ Altında'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden relative">
              {/* Threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                style={{ left: `${Math.min(100, (threshold / 40) * 100)}%` }}
              />
              {/* Temp fill */}
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (maxTemp / 40) * 100)}%`,
                  backgroundColor: maxTemp > threshold ? '#f97316' : '#3b82f6',
                }}
              />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor}`}>
              {statusLabel}
            </span>
            <span>{timeDisplay}</span>
          </div>
          <a
            href={wttrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-2"
          >
            wttr.in/{city}
          </a>
        </div>
      </div>
    </div>
  );
}
