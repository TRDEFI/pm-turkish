'use client';

import { useState } from 'react';
import WeatherEvents from './WeatherEvents';
import CryptoDailyEvents from './CryptoDailyEvents';
import Crypto5minEvents from './Crypto5minEvents';
import ForexEvents from './ForexEvents';

const TABS = [
  { key: 'hava', label: 'Hava', emoji: '🌤️', component: WeatherEvents },
  { key: 'kripto-gun', label: 'Kripto Gün', emoji: '📈', component: CryptoDailyEvents },
  { key: 'kripto-5dk', label: 'Kripto 5dk', emoji: '⚡', component: Crypto5minEvents },
  { key: 'doviz', label: 'Döviz', emoji: '💱', component: ForexEvents },
  { key: 'yakinda', label: 'Yakında', emoji: '🔜', component: null },
];

export default function GeneratedEventsSection() {
  const [activeTab, setActiveTab] = useState('hava');
  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-[1_1_auto] min-w-[4rem] py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
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
      {activeTab === 'kripto-gun' && <CryptoDailyEvents />}
      {activeTab === 'kripto-5dk' && <Crypto5minEvents />}
      {activeTab === 'doviz' && <ForexEvents />}
      {activeTab === 'yakinda' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-4xl">🔜</span>
          <p className="text-slate-400 text-sm font-medium">Diğer event türleri hazırlanıyor...</p>
          <p className="text-slate-500 text-xs text-center max-w-xs">
            Polymarket entegrasyonu, tahmin oyunları ve daha fazlası yakında.
          </p>
        </div>
      )}
    </div>
  );
}
