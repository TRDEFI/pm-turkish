'use client';

import { Navbar } from '@/components/Navbar';

// Mock data
const USER_BALANCE = 150.00;
const ACTIVE_BETS = [
  { id: 1, eventId: 1, question: 'Will Bitcoin reach $100,000?', side: 'YES', amount: 50, status: 'active' },
  { id: 2, eventId: 2, question: 'Will Turkey win Euro 2028?', side: 'NO', amount: 20, status: 'active' },
];
const HISTORY = [
  { id: 1, type: 'Deposit', amount: 200, date: '2026-05-20', status: 'completed' },
  { id: 2, type: 'Bet', amount: -50, date: '2026-05-21', status: 'completed' },
  { id: 3, type: 'Bet', amount: -20, date: '2026-05-21', status: 'completed' },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Balance Card */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">Available Balance</p>
          <p className="text-4xl font-bold">{USER_BALANCE.toFixed(2)} USDC</p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/30">
              Deposit
            </button>
            <button className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/30">
              Withdraw
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Active Bets */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Active Bets</h2>
            {ACTIVE_BETS.length === 0 ? (
              <p className="text-gray-500">No active bets.</p>
            ) : (
              <div className="space-y-4">
                {ACTIVE_BETS.map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                    <div>
                      <p className="font-medium text-gray-900">{bet.question}</p>
                      <p className="text-sm text-gray-500">
                        Side: <span className={bet.side === 'YES' ? 'text-green-600' : 'text-red-600'}>{bet.side}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{bet.amount} USDC</p>
                      <p className="text-xs text-gray-500 capitalize">{bet.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Transaction History</h2>
            {HISTORY.length === 0 ? (
              <p className="text-gray-500">No transactions yet.</p>
            ) : (
              <div className="space-y-4">
                {HISTORY.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{tx.type}</p>
                      <p className="text-sm text-gray-500">{tx.date}</p>
                    </div>
                    <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} USDC
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
