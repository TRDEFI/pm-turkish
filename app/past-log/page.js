'use client';

import Link from 'next/link';

// ─── Weather events (5 Nisan) ───
const PAST_WEATHER = [
  { city: 'İstanbul', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 15, actualTemp: 18, predicted: 'EVET', correct: true, icon: '☀️', weather: 'Güneşli' },
  { city: 'Ankara', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 12, actualTemp: 14, predicted: 'EVET', correct: true, icon: '⛅', weather: 'Parçalı Bulutlu' },
  { city: 'İzmir', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 18, actualTemp: 16, predicted: 'HAYIR', correct: true, icon: '🌧️', weather: 'Yağmurlu' },
  { city: 'Samsun', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 15, actualTemp: 15, predicted: 'EVET', correct: false, icon: '🌫️', weather: 'Sisli' },
  { city: 'Antalya', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 20, actualTemp: 22, predicted: 'HAYIR', correct: false, icon: '☀️', weather: 'Güneşli' },
  { city: 'Trabzon', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 15, actualTemp: 13, predicted: 'HAYIR', correct: true, icon: '🌧️', weather: 'Yağmurlu' },
  { city: 'Bursa', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 15, actualTemp: 16, predicted: 'EVET', correct: true, icon: '⛅', weather: 'Parçalı Bulutlu' },
  { city: 'Adana', date: '2026-04-05', timeRange: '07:00-19:00', threshold: 20, actualTemp: 24, predicted: 'EVET', correct: true, icon: '☀️', weather: 'Güneşli' },
];

// ─── Crypto session logs (last 5 per coin, 5-min windows) ───
const PAST_CRYPTO = [
  // BTC — 5 son seans
  { coin: 'BTC', time: '14:55', ref: 69600, close: 69750, dir: 'YUKARI', correct: true, pnl: '+$45' },
  { coin: 'BTC', time: '14:50', ref: 69580, close: 69520, dir: 'AŞAĞI', correct: true, pnl: '+$32' },
  { coin: 'BTC', time: '14:45', ref: 69620, close: 69680, dir: 'YUKARI', correct: true, pnl: '+$28' },
  { coin: 'BTC', time: '14:40', ref: 69550, close: 69480, dir: 'YUKARI', correct: false, pnl: '-$20' },
  { coin: 'BTC', time: '14:35', ref: 69500, close: 69530, dir: 'AŞAĞI', correct: false, pnl: '-$15' },
  // ETH — 5 son seans
  { coin: 'ETH', time: '14:55', ref: 2150, close: 2155, dir: 'YUKARI', correct: true, pnl: '+$18' },
  { coin: 'ETH', time: '14:50', ref: 2148, close: 2142, dir: 'AŞAĞI', correct: true, pnl: '+$14' },
  { coin: 'ETH', time: '14:45', ref: 2152, close: 2158, dir: 'YUKARI', correct: true, pnl: '+$22' },
  { coin: 'ETH', time: '14:40', ref: 2145, close: 2140, dir: 'AŞAĞI', correct: false, pnl: '-$8' },
  { coin: 'ETH', time: '14:35', ref: 2147, close: 2150, dir: 'AŞAĞI', correct: false, pnl: '-$12' },
  // XRP — 5 son seans
  { coin: 'XRP', time: '14:55', ref: 1.349, close: 1.352, dir: 'YUKARI', correct: true, pnl: '+$8' },
  { coin: 'XRP', time: '14:50', ref: 1.348, close: 1.345, dir: 'AŞAĞI', correct: true, pnl: '+$6' },
  { coin: 'XRP', time: '14:45', ref: 1.350, close: 1.353, dir: 'YUKARI', correct: true, pnl: '+$10' },
  { coin: 'XRP', time: '14:40', ref: 1.347, close: 1.344, dir: 'YUKARI', correct: false, pnl: '-$5' },
  { coin: 'XRP', time: '14:35', ref: 1.346, close: 1.348, dir: 'AŞAĞI', correct: false, pnl: '-$4' },
];

const COIN_META = {
  BTC: { name: 'Bitcoin', symbol: '₿', accent: '#f7931a' },
  ETH: { name: 'Ethereum', symbol: 'Ξ', accent: '#627eea' },
  XRP: { name: 'Ripple', symbol: '✕', accent: '#00aae4' },
};

export default function PastLogPage() {
  const wCorrect = PAST_WEATHER.filter(e => e.correct).length;
  const wTotal = PAST_WEATHER.length;

  const cCorrect = PAST_CRYPTO.filter(e => e.correct).length;
  const cTotal = PAST_CRYPTO.length;
  const totalPnl = PAST_CRYPTO.reduce((s, e) => s + parseFloat(e.pnl.replace('$','')), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d0f14] to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Ana Sayfa
          </Link>
          <h1 className="text-lg font-semibold text-white">📋 Geçmiş Tahminler</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Hava Doğru" value={`${wCorrect}/${wTotal}`} color="text-sky-400" />
          <StatCard label="Kripto Doğru" value={`${cCorrect}/${cTotal}`} color="text-emerald-400" />
          <StatCard label="Kripto PnL" value={`$${totalPnl.toFixed(0)}`} color={totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          <StatCard label="Toplam Seans" value={wTotal + cTotal} color="text-slate-300" />
        </div>

        {/* ── Weather Log ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            🌤️ Hava Durumu — 5 Nisan 2026
          </h2>
          <div className="space-y-2">
            {PAST_WEATHER.map((evt, i) => (
              <div key={i}
                className={`rounded-lg p-3 flex items-center justify-between transition-all ${
                  evt.correct
                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                    : 'bg-rose-500/5 border border-rose-500/20'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{evt.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{evt.city}</p>
                    <p className="text-[10px] text-slate-500">{evt.timeRange} · Hedef: {evt.threshold}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[9px] text-slate-500">Tahmin</p>
                    <span className={`text-xs font-bold ${evt.predicted === 'EVET' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {evt.predicted === 'EVET' ? '✓ EVET' : '✗ HAYIR'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500">Gerçekleşti</p>
                    <p className="text-base font-bold text-white">{evt.actualTemp}°C</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                    evt.correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {evt.correct ? '✅ DOĞRU' : '❌ YANLIŞ'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Crypto Log ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            ₿ Kripto 5-Dakika Seanslar — Son 25 Dk
          </h2>
          <div className="space-y-4">
            {['BTC', 'ETH', 'XRP'].map((coin) => {
              const meta = COIN_META[coin];
              const coinEvents = PAST_CRYPTO.filter(e => e.coin === coin);
              const coinCorrect = coinEvents.filter(e => e.correct).length;
              const coinPnl = coinEvents.reduce((s, e) => s + parseFloat(e.pnl.replace('$','')), 0);

              return (
                <div key={coin} className="bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden">
                  {/* Coin header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <span style={{ color: meta.accent }} className="text-lg font-bold">{meta.symbol}</span>
                      <span className="text-sm font-medium text-white">{meta.name}</span>
                      <span className="text-[10px] text-slate-500">5-dakika</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{coinCorrect}/5 doğru</span>
                      <span className={`font-bold ${coinPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {coinPnl >= 0 ? '+' : ''}${coinPnl}
                      </span>
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="divide-y divide-slate-700/20">
                    {coinEvents.map((evt, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-slate-700/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            evt.dir === 'YUKARI' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {evt.dir}
                          </span>
                          <span className="text-xs text-slate-400">{evt.time}</span>
                          <span className="text-[10px] text-slate-500">Ref: ${evt.ref.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-300">→ {evt.close.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${evt.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {evt.correct ? '✅' : '❌'}
                          </span>
                          <span className={`text-xs font-mono font-bold ${evt.pnl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {evt.pnl}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
