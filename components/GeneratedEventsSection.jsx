'use client';

import { useState } from 'react';
import WeatherEvents from './WeatherEvents';

const TABS = [
  { key: 'hava', label: 'Hava Durumu', emoji: '🌤️', component: WeatherEvents },
  { key: 'kripto', label: 'Kripto', emoji: '₿' },
  { key: 'doviz', label: 'Döviz', emoji: '💵' },
];

export default function GeneratedEventsSection() {
  const [activeTab, setActiveTab] = useState('hava');
  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'hava' && <WeatherEvents />}

      {activeTab === 'kripto' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">₿</span>
          <p className="text-slate-400 text-sm font-medium">Kripto event'leri yakında</p>
          <p className="text-slate-500 text-xs text-center max-w-xs">
            Fiyat threshold'lu tahmin soruları hazırlanıyor...
          </p>
        </div>
      )}

      {activeTab === 'doviz' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">💵</span>
          <p className="text-slate-400 text-sm font-medium">Döviz event'leri yakında</p>
          <p className="text-slate-500 text-xs text-center max-w-xs">
            USD/TRY, EUR/TRY threshold tahmin soruları hazırlanıyor...
          </p>
        </div>
      )}
    </div>
  );
}
