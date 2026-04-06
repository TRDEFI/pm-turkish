'use client';

import { useState } from 'react';

const PAST_EVENTS = [
  {
    city: 'İstanbul',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 15,
    actualTemp: 18,
    predicted: 'EVET',
    correct: true,
    icon: '☀️',
    weather: 'Güneşli',
  },
  {
    city: 'Ankara',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 12,
    actualTemp: 14,
    predicted: 'EVET',
    correct: true,
    icon: '⛅',
    weather: 'Parçalı Bulutlu',
  },
  {
    city: 'İzmir',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 18,
    actualTemp: 16,
    predicted: 'HAYIR',
    correct: true,
    icon: '🌧️',
    weather: 'Yağmurlu',
  },
  {
    city: 'Samsun',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 15,
    actualTemp: 15,
    predicted: 'EVET',
    correct: false,
    icon: '🌫️',
    weather: 'Sisli',
  },
  {
    city: 'Antalya',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 20,
    actualTemp: 22,
    predicted: 'HAYIR',
    correct: false,
    icon: '☀️',
    weather: 'Güneşli',
  },
  {
    city: 'Trabzon',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 15,
    actualTemp: 13,
    predicted: 'HAYIR',
    correct: true,
    icon: '🌧️',
    weather: 'Yağmurlu',
  },
  {
    city: 'Bursa',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 15,
    actualTemp: 16,
    predicted: 'EVET',
    correct: true,
    icon: '⛅',
    weather: 'Parçalı Bulutlu',
  },
  {
    city: 'Adana',
    date: '2026-04-05',
    timeRange: '07:00-19:00',
    threshold: 20,
    actualTemp: 24,
    predicted: 'EVET',
    correct: true,
    icon: '☀️',
    weather: 'Güneşli',
  },
];

export default function PastLogPage() {
  const events = PAST_EVENTS;
  const correct = events.filter(e => e.correct).length;
  const total = events.length;
  const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Ana Sayfa
            </a>
            <h1 className="text-xl font-bold gradient-text">📋 Geçmiş Tahminler</h1>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4 text-center">
            <p className="text-3xl font-bold text-white">{total}</p>
            <p className="text-xs text-slate-500 mt-1">Toplam Tahmin</p>
          </div>
          <div className="bg-slate-800/80 rounded-xl border border-emerald-500/20 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{correct}</p>
            <p className="text-xs text-slate-500 mt-1">Doğru</p>
          </div>
          <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4 text-center">
            <p className="text-3xl font-bold text-sky-400">{winRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Başarı Oranı</p>
          </div>
        </div>

        {/* Event Log */}
        <h2 className="text-base font-bold text-slate-100 mb-4">5 Nisan 2026 — Sonuçlar</h2>

        <div className="space-y-3">
          {events.map((evt, i) => (
            <div key={i} className="bg-slate-800/90 rounded-xl border overflow-hidden hover:shadow-lg transition-all"
              style={{ borderColor: evt.correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)' }}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{evt.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{evt.city}</h3>
                      <p className="text-[10px] text-slate-500">{evt.date} {evt.timeRange} arası en yüksek {evt.threshold}°C'yi geçer mi?</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Predicted */}
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500">Tahmin</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        evt.predicted === 'EVET'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {evt.predicted === 'EVET' ? '✓' : '✗'} {evt.predicted}
                      </span>
                    </div>

                    {/* Actual */}
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500">Gerçekleşti</p>
                      <p className="text-xl font-bold text-white">{evt.actualTemp}°C</p>
                      <p className="text-[10px] text-slate-500">{evt.weather}</p>
                    </div>

                    {/* Result */}
                    <div className={`px-3 py-2 rounded-lg text-center font-bold text-sm ${
                      evt.correct
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {evt.correct ? '✅ DOĞRU' : '❌ YANLIŞ'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-16 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-xs text-slate-500 text-center">
          <p>Bu bir açık kaynak projesidir. Polymarket ile resmi olarak bağlantılı değildir.</p>
        </div>
      </footer>
    </div>
  );
}
