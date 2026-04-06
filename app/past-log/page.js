'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://aytotwrddgjbstcprbev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dG90d3JkZGdjYnN0Y3ByYmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTkzNTEsImV4cCI6MjA5MDk4OTMwMH0.Vmi0bteqc7bm5P8IxNbw4wPAiar02BXwQhyksSa7FmM';

async function supabaseQuery(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}${qs ? '?' + qs : ''}`, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Supabase ${endpoint}: ${res.status}`, errText.slice(0,200));
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`Supabase fetch error:`, e.message);
    return null;
  }
}

export default function PastLogPage() {
  const [forexData, setForexData] = useState([]);
  const [cryptoDailyData, setCryptoDailyData] = useState([]);
  const [llmEvents, setLlmEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState('checking');

  useEffect(() => {
    Promise.all([loadForex(), loadCryptoDaily(), loadLlmEvents()]).finally(() => setLoading(false));
  }, []);

  async function loadForex() {
    const rates = [
      { currency: 'USD', symbol: 'USD/TRY', threshold: 40.0000, icon: '💵' },
      { currency: 'EUR', symbol: 'EUR/TRY', threshold: 43.5000, icon: '💶' },
      { currency: 'GBP', symbol: 'GBP/TRY', threshold: 51.0000, icon: '💷' },
    ];
    const results = await Promise.all(
      rates.map(async (r) => {
        try {
          const res = await fetch(`https://open.er-api.com/v6/latest/${r.currency}`);
          if (!res.ok) return { ...r, rate: null, correct: null, hasData: false };
          const data = await res.json();
          if (data?.rates?.[r.currency]) {
            const rate = parseFloat(data.rates[r.currency]);
            return { ...r, rate, correct: rate >= r.threshold, hasData: true };
          }
        } catch { /* */ }
        return { ...r, rate: null, correct: null, hasData: false };
      })
    );
    setForexData(results);
  }

  async function loadCryptoDaily() {
    const coins = [
      { symbol: 'BTC', pair: 'BTCUSDT', decimals: 0, threshold: 70000, icon: '₿', name: 'Bitcoin', accent: '#f7931a' },
      { symbol: 'ETH', pair: 'ETHUSDT', decimals: 2, threshold: 2200, icon: 'Ξ', name: 'Ethereum', accent: '#627eea' },
      { symbol: 'XRP', pair: 'XRPUSDT', decimals: 4, threshold: 1.4000, icon: '✕', name: 'Ripple', accent: '#00aae4' },
    ];
    const results = await Promise.all(
      coins.map(async (c) => {
        try {
          const res = await fetch(`/.netlify/functions/binance-proxy?symbol=${c.pair}`);
          if (!res.ok) return { ...c, price: null, status: 'waiting', hasData: false };
          const data = await res.json();
          const price = parseFloat(data.priceData?.price || 0);
          if (!price) return { ...c, price: null, status: 'waiting', hasData: false };
          return { ...c, price, status: price >= c.threshold ? 'above' : 'below', hasData: true };
        } catch { return { ...c, price: null, status: 'waiting', hasData: false }; }
      })
    );
    setCryptoDailyData(results);
  }

  async function loadLlmEvents() {
    setSupabaseStatus('querying');
    const data = await supabaseQuery('events', {
      select: '*',
      order: 'created_at.desc',
      limit: 50,
    });

    if (data === null) {
      setSupabaseStatus('error');
    } else if (data.length === 0) {
      setSupabaseStatus('empty');
    } else {
      setSupabaseStatus('ok');
    }
    setLlmEvents(data || []);
  }

  const fCorrect = forexData.filter(e => e.correct).length;
  const fTotal = forexData.filter(e => e.hasData).length;
  const cTotal = cryptoDailyData.filter(e => e.hasData).length;
  const cAbove = cryptoDailyData.filter(e => e.status === 'above').length;
  const llmCount = llmEvents?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d0f14] to-slate-900">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Ana Sayfa</Link>
          <h1 className="text-lg font-semibold text-white">📋 Geçmiş Tahminler</h1>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            supabaseStatus === 'ok' ? 'bg-emerald-500/10 text-emerald-400' :
            supabaseStatus === 'empty' ? 'bg-yellow-500/10 text-yellow-400' :
            supabaseStatus === 'error' ? 'bg-rose-500/10 text-rose-400' :
            supabaseStatus === 'querying' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
            'bg-slate-500/10 text-slate-500'
          }`}>
            Supabase: {supabaseStatus}
          </span>
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
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Forex Doğru" value={`${fCorrect}/${fTotal}`} color="text-sky-400" />
              <StatCard label="Kripto Üstünde" value={`${cAbove}/${cTotal}`} color="text-emerald-400" />
              <StatCard label="LLM Events" value={llmCount || '—'} color="text-violet-400" />
              <StatCard label="Toplam Seans" value={fTotal + cTotal} color="text-slate-300" />
            </div>

            {/* Forex */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">💱 Döviz — 6 Nisan 2026 (16:45 GMT+3 Kapanış)</h2>
              <div className="space-y-2">
                {forexData.map((evt, i) => (
                  <div key={i} className={`rounded-lg p-3 flex items-center justify-between ${
                    evt.hasData
                      ? evt.correct ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-rose-500/5 border border-rose-500/20'
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
                        <p className="text-base font-bold text-white">{evt.hasData ? `${evt.rate?.toFixed(4)}` : '—'}</p>
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
            </section>

            {/* Kripto Günlük */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">📈 Kripto Günlük — 6 Nisan 2026 (23:59 GMT+3 Hedef)</h2>
              <div className="space-y-2">
                {cryptoDailyData.map((evt, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ color: evt.accent }} className="text-lg font-bold">{evt.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{evt.name}</p>
                        <p className="text-[10px] text-slate-500">23:59 · Hedef: ${evt.threshold.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-[9px] text-slate-500">Son Fiyat</p>
                        <p className="text-base font-bold text-white">{evt.hasData ? `$${evt.price?.toLocaleString()}` : '—'}</p>
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
            </section>

            {/* Supabase Events */}
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">🔮 LLM Events (Supabase)</h2>
              {supabaseStatus === 'error' && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4 text-center mb-3">
                  <p className="text-sm text-rose-400 font-medium">Supabase bağlantı hatası</p>
                  <p className="text-xs text-slate-500 mt-1">RLS policy'lerini kontrol et — events tablosuna SELECT izni yok olabilir</p>
                  <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-800/50 px-2 py-1 rounded inline-block">
                    {SUPABASE_URL}/rest/v1/events?select=*&limit=5
                  </p>
                </div>
              )}
              {supabaseStatus === 'empty' && (
                <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-6 text-center">
                  <p className="text-sm text-slate-400 mb-1">Supabase bağlantısı OK ✅ ama events tablosu boş</p>
                  <p className="text-xs text-slate-500">generate-events fonksiyonu çalıştığında event'ler burada görünür.</p>
                </div>
              )}
              {supabaseStatus === 'ok' && llmEvents.length > 0 && (
                <div className="space-y-2">
                  {llmEvents.map((evt, i) => (
                    <div key={evt.id || i} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3">
                      <p className="text-sm font-medium text-white">{evt.title || evt.question || 'Event'}</p>
                      {evt.description && <p className="text-[10px] text-slate-500 mt-1">{evt.description}</p>}
                      {evt.ref_links && <p className="text-[10px] text-slate-600 mt-1">Kaynak: {JSON.stringify(evt.ref_links)}</p>}
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
