'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const RATES = {
  USD_TRY: { threshold: 40.0000, icon: '💵', symbol: 'USD/TRY' },
  EUR_TRY: { threshold: 43.5000, icon: '💶', symbol: 'EUR/TRY' },
  GBP_TRY: { threshold: 51.0000, icon: '💷', symbol: 'GBP/TRY' },
};

const CRYPTO_COINS = [
  { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, threshold: 70000, icon: '₿', name: 'Bitcoin' },
  { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, threshold: 2200, icon: 'Ξ', name: 'Ethereum' },
  { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, threshold: 1.4000, icon: '✕', name: 'Ripple' },
];

const WEATHER_CITIES = [
  { city: 'İstanbul', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 15 },
  { city: 'Ankara', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 12 },
  { city: 'İzmir', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 18 },
  { city: 'Samsun', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 15 },
  { city: 'Antalya', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 20 },
  { city: 'Trabzon', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 15 },
  { city: 'Bursa', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 15 },
  { city: 'Adana', date: '2026-04-07', timeRange: '07:00-19:00', threshold: 20 },
];

const SUPABASE_URL = 'https://aytotwrddgjbstcprbev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdjYnN0Y3ByYmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTMzMDAsImV4cCI6MjA5MDk4OTMwMH0.FgCB3RqtEQVmBypndva4RZQHPW_uref_Vt-OqTigZW8';

function getEnglishCity(city) {
  const map = { 'İstanbul': 'Istanbul', 'İzmir': 'Izmir' };
  return map[city] || city;
}

function formatDateTR(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHourTR(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:00 ${suffix}`;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function getWeatherIcon(code) {
  const map = { 113: '☀️', 116: '⛅', 119: '☁️', 122: '☁️', 143: '🌫️', 176: '🌦️', 200: '⛈️', 266: '🌧️', 293: '🌦️', 296: '🌧️', 299: '🌧️', 302: '🌧️', 323: '🌨️', 326: '🌨️', 329: '❄️' };
  return map[code] || '🌡️';
}

export default function PastLogPage() {
  const [forexData, setForexData] = useState([]);
  const [cryptoDailyData, setCryptoDailyData] = useState([]);
  const [llmEvents, setLlmEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadForex(), loadCryptoDaily(), loadLlmEvents()]).finally(() => setLoading(false));
  }, []);

  async function loadForex() {
    const results = await Promise.all(
      Object.entries(RATES).map(async ([key, meta]) => {
        const data = await fetchJson(`https://open.er-api.com/v6/latest/${meta.symbol}`);
        if (data?.rates?.[meta.symbol]) {
          const rate = parseFloat(data.rates[meta.symbol]);
          const correct = rate >= meta.threshold;
          return { ...meta, currency: key, rate, correct, hasData: true };
        }
        return { ...meta, currency: key, rate: null, correct: null, hasData: false };
      })
    );
    setForexData(results);
  }

  async function loadCryptoDaily() {
    const results = await Promise.all(
      CRYPTO_COINS.map(async (c) => {
        try {
          const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${c.pair}`);
          if (!res.ok) return { ...c, price: null, status: 'waiting', hasData: false };
          const data = await res.json();
          const price = parseFloat(data.priceData?.price || 0);
          if (!price) return { ...c, price: null, status: 'waiting', hasData: false };
          const status = price >= c.threshold ? 'above' : 'below';
          return { ...c, price, status, hasData: true };
        } catch { return { ...c, price: null, status: 'waiting', hasData: false }; }
      })
    );
    setCryptoDailyData(results);
  }

  async function loadLlmEvents() {
    try {
      const res = await fetch(`https://aytotwrddgjbstcprbev.supabase.co/rest/v1/events?select=*&order=created_at.desc&limit=50`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLlmEvents(data || []);
      }
    } catch { /* ignore */ }
  }

  // ─── Stats ───
  const fCorrect = forexData.filter(e => e.correct).length;
  const fTotal = forexData.filter(e => e.hasData).length;
  const cAbove = cryptoDailyData.filter(e => e.status === 'above').length;
  const cBelow = cryptoDailyData.filter(e => e.status === 'below').length;
  const cTotal = cryptoDailyData.filter(e => e.hasData).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d0f14] to-slate-900">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Ana Sayfa</Link>
          <h1 className="text-lg font-semibold text-white">📋 Geçmiş Tahminler</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-[3px] border-slate-700 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Veriler yükleniyor...</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Forex Doğru" value={`${fCorrect}/${fTotal}`} color="text-sky-400" />
              <StatCard label="Kripto Günlük" value={`${cAbove}/${cTotal}`} color="text-emerald-400" />
              <StatCard label="LLM Events" value={llmEvents.length || '—'} color="text-violet-400" />
              <StatCard label="Toplam Seans" value={fTotal + cTotal} color="text-slate-300" />
            </div>

            {/* Forex Results */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                💱 Döviz — 6 Nisan 2026 (16:45 GMT+3 Kapanış)
              </h2>
              {forexData.length === 0 ? (
                <p className="text-slate-500 text-sm">Veri yüklenemedi</p>
              ) : (
                <div className="space-y-2">
                  {forexData.map((evt, i) => (
                    <div key={i} className={`rounded-lg p-3 flex items-center justify-between transition-all ${
                      evt.hasData
                        ? evt.correct
                          ? 'bg-emerald-500/5 border border-emerald-500/20'
                          : 'bg-rose-500/5 border border-rose-500/20'
                        : 'bg-slate-800/30 border border-slate-700/20'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{evt.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{evt.symbol}</p>
                          <p className="text-[10px] text-slate-500">16:45 · Hedef: {evt.threshold.toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-[9px] text-slate-500">Kapanış</p>
                          <p className="text-base font-bold text-white">{evt.hasData ? `${evt.rate.toFixed(4)}₺` : '—'}</p>
                        </div>
                        {evt.hasData && (
                          <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                            evt.correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {evt.correct ? '✅ Hedef Aşıldı' : '❌ Hedef Aşılmadı'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Crypto Daily Results */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                📈 Kripto Günlük — 6 Nisan 2026 (23:59 GMT+3 Hedef)
              </h2>
              {cryptoDailyData.length === 0 ? (
                <p className="text-slate-500 text-sm">Veri yüklenemedi</p>
              ) : (
                <div className="space-y-2">
                  {cryptoDailyData.map((evt, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span style={{ color: evt.icon === '₿' ? '#f7931a' : evt.icon === 'Ξ' ? '#627eea' : '#00aae4' }} className="text-lg font-bold">{evt.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{evt.name}</p>
                          <p className="text-[10px] text-slate-500">23:59 · Hedef: ${evt.threshold.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-[9px] text-slate-500">Son Fiyat</p>
                          <p className="text-base font-bold text-white">{evt.hasData ? `$${evt.price.toLocaleString()}` : '—'}</p>
                        </div>
                        {evt.hasData && (
                          <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                            evt.status === 'above' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {evt.status === 'above' ? '✅ Aşıldı' : '❌ Aşılmadı'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* LLM Events from Supabase */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                🔮 LLM Events (Supabase)
              </h2>
              {llmEvents.length === 0 ? (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-8 text-center">
                  <p className="text-slate-400 text-sm mb-2">Supabase events tablosunda henüz kayıt yok</p>
                  <p className="text-slate-500 text-xs">generate-events fonksiyonu çalıştığında event'ler burada görünecek.</p>
                  <p className="text-slate-500 text-xs mt-1">Test: <code className="bg-slate-700/50 px-2 py-0.5 rounded text-sky-400">/.netlify/functions/generate-events</code></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {llmEvents.map((evt, i) => (
                    <div key={evt.id || i} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3">
                      <p className="text-sm font-medium text-white">{evt.title || 'Event'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{evt.description || ''}</p>
                      {evt.ref_links && (
                        <p className="text-[10px] text-slate-600 mt-1">Kaynak: {JSON.stringify(evt.ref_links)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800/60 rounded-lg border border-slate-700/30 p-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-1">{label}</p>
    </div>
  );
}
