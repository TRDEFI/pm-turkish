'use client';

import { Navbar } from '@/components/Navbar';
import { useState } from 'react';

// Mock data for events
const MOCK_EVENTS = [
  {
    id: 1,
    question: 'Will Bitcoin reach $100,000 by end of 2026?',
    category: 'Crypto',
    deadline: '2026-12-31T23:59:59Z',
    yesPool: 1200,
    noPool: 800,
    status: 'active',
  },
  {
    id: 2,
    question: 'Will Turkey win the Euro 2028 qualifiers?',
    category: 'Sports',
    deadline: '2027-11-15T20:00:00Z',
    yesPool: 500,
    noPool: 1500,
    status: 'active',
  },
  {
    id: 3,
    question: 'Will AI replace 50% of coding jobs by 2030?',
    category: 'Technology',
    deadline: '2030-01-01T00:00:00Z',
    yesPool: 3000,
    noPool: 2000,
    status: 'active',
  },
];

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('');

  const handleBet = (eventId: number) => {
    setSelectedEvent(eventId);
  };

  const confirmBet = () => {
    alert(`Bet placed: ${betAmount} USDC on ${betSide.toUpperCase()} for Event ${selectedEvent}`);
    setSelectedEvent(null);
    setBetAmount('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Active Events</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_EVENTS.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                  {event.category}
                </span>
                <span className="text-xs text-gray-500">
                  Ends: {new Date(event.deadline).toLocaleDateString()}
                </span>
              </div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">{event.question}</h3>
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>YES Pool</span>
                  <span className="font-medium text-green-600">{event.yesPool} USDC</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${(event.yesPool / (event.yesPool + event.noPool)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>NO Pool</span>
                  <span className="font-medium text-red-600">{event.noPool} USDC</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleBet(event.id)}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Bet YES
                </button>
                <button
                  onClick={() => handleBet(event.id)}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Bet NO
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bet Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Place Your Bet</h2>
            <div className="mb-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Side</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBetSide('yes')}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                      betSide === 'yes' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setBetSide('no')}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                      betSide === 'no' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Amount (USDC)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBet}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Confirm Bet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
