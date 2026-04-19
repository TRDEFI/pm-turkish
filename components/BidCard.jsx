'use client';

import { useState, useRef } from 'react';
import { t } from '../lib/translations';
import { translateQuestion } from '../lib/autoTranslate';

/* ─── Trade Modal ─── */
function TradeModal({ market, choice, onClose }) {
  const overlayRef = useRef(null);
  const [amount, setAmount] = useState('');
  const { question } = market;
  const questionTr = translateQuestion(question);

  const rawOutcomes = JSON.parse(market.outcomes || '[]');
  const isMatchup = rawOutcomes.length >= 2
    && !rawOutcomes[0].toLowerCase().includes('yes')
    && !rawOutcomes[0].toLowerCase().includes('no');

  const label = isMatchup ? rawOutcomes[choice === 0 ? 0 : 1] : (choice === 0 ? 'EVET' : 'HAYIR');

  const priceList = (market._livePrices && market._livePrices.length === 2)
    ? market._livePrices
    : JSON.parse(market.outcomePrices || '[]').map(Number);
  const price = priceList[choice] || 0;
  const potentialReturn = amount ? (parseFloat(amount) / Math.max(price, 0.01)).toFixed(2) : '—';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="rounded-2xl border w-[400px] max-w-[95vw] overflow-hidden shadow-2xl"
        style={{ background: '#0f1420', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-sm font-semibold text-white truncate">{questionTr}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none transition-colors shrink-0">×</button>
        </div>

        {/* Choice Badge */}
        <div className="px-5 pt-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            choice === 0
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {choice === 0 ? '✓ EVET' : '✗ HAYIR'}
          </div>
        </div>

        {/* Price */}
        <div className="px-5 pt-3 pb-4">
          <div className="text-2xl font-black text-white">{(price * 100).toFixed(1)}¢</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Piyasa fiyatı</div>
        </div>

        {/* Currency Selector */}
        <div className="px-5 pb-3">
          <label className="text-xs text-slate-400 mb-1.5 block">Ödeme Yöntemi</label>
          <div className="flex gap-2">
            {[
              { name: 'USDT', icon: '₮', bg: '#26a17b' },
              { name: 'USDC', icon: '$', bg: '#2775ca' },
              { name: 'DAI',  icon: '◈', bg: '#f5af31' },
            ].map((c, i) => (
              <div key={c.name}
                className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  i === 0
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-white/8 bg-white/3'
                }`}
              >
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                  style={{ backgroundColor: c.bg }}>{c.icon}</div>
                <span className="text-xs font-medium text-slate-300">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="px-5 pb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Miktar Girin (USD)</label>
          <div className="relative">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-700 focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">USD</span>
          </div>
        </div>

        {/* Estimated Return */}
        {amount && parseFloat(amount) > 0 && (
          <div className="mx-5 mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tahmini Getiri</span>
              <span className="text-white font-bold">${potentialReturn}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-slate-400 text-sm font-medium transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            İptal
          </button>
          <button className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: choice === 0
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
            }}>
            {choice === 0 ? '🟢 Tahmini Onayla' : '🔴 Tahmini Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── BidCard ─── */
export default function BidCard({ market, priceChange }) {
  const {
    question, outcomes, outcomePrices, liquidityNum, volumeNum, endDate,
    active = true, _livePrices,
  } = market;

  const [modal, setModal] = useState(null);
  const questionTr = translateQuestion(question);
  const isBtc5min = market.isBtc5min === true;

  const rawOutcomes = JSON.parse(outcomes || '[]');
  const outcomeList = rawOutcomes.slice(0, 2);
  const priceList = (_livePrices && _livePrices.length === 2)
    ? _livePrices
    : JSON.parse(outcomePrices || '[]').map(Number).slice(0, 2);

  const isMatchup = rawOutcomes.length >= 2
    && !rawOutcomes[0].toLowerCase().includes('yes')
    && !rawOutcomes[0].toLowerCase().includes('no');

  const formatPct = (p) => {
    if (p == null || isNaN(p)) return '—';
    if (p < 0.001) return '<0.1%';
    if (p < 0.01) return `${(p * 100).toFixed(2)}%`;
    if (p < 0.1) return `${(p * 100).toFixed(1)}%`;
    return `${Math.round(p * 100)}%`;
  };

  const formatMoney = (n) => {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${Math.round(n)}`;
  };

  const timeLeft = () => {
    if (!endDate) return '—';
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return 'Bitti';
    const d = Math.floor(diff / 86400000);
    if (d > 365) return `${Math.floor(d / 365)} yıl`;
    if (d > 30) return `${Math.floor(d / 30)} ay`;
    if (d > 0) return `${d}g`;
    const h = Math.floor(diff / 3600000);
    if (h > 0) return `${h}sa`;
    const m = Math.floor(diff / 60000);
    return `${m}dk`;
  };

  const btcTimeLeft = () => {
    if (!endDate) return '—';
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0) return 'Bitti';
    const m = Math.floor(diff / 60000);
    if (m < 1) return '<1dk';
    return `${m}dk`;
  };

  const hasLive = _livePrices && _livePrices.length === 2;

  const getLabelColor = (i) => {
    if (!isMatchup) return i === 0 ? 'text-emerald-400' : 'text-rose-400';
    return 'text-blue-400';
  };
  const getBgColor = (i) => {
    if (!isMatchup) return i === 0 ? 'rgba(16,185,129,0.07)' : 'rgba(244,63,94,0.07)';
    return 'rgba(59,130,246,0.07)';
  };
  const getBarBg = (i) => {
    if (!isMatchup) return i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)';
    return 'rgba(59,130,246,0.15)';
  };
  const getBarColor = (i) => {
    if (!isMatchup) return i === 0 ? '#10b981' : '#f43f5e';
    return '#3b82f6';
  };
  const getLabel = (i) => {
    if (isMatchup) return rawOutcomes[i] || `Sonuç ${i + 1}`;
    return i === 0 ? 'EVET' : 'HAYIR';
  };

  return (
    <>
    <div className="group relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl"
      style={{
        background: 'rgba(11,13,23,0.8)',
        borderColor: hasLive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
        '--hover-border': hasLive ? 'rgba(59,130,246,0.4)' : 'rgba(129,140,248,0.3)',
      }}
      className={`group relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer ${
        hasLive ? 'hover:border-blue-400/40' : 'hover:border-indigo-400/30'
      }`}
      onMouseEnter={e => e.currentTarget.style.borderColor = hasLive ? 'rgba(59,130,246,0.4)' : 'rgba(129,140,248,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = hasLive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}
      >
      {/* Top color line */}
      {hasLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0 opacity-60" />
      )}

      <div className="p-4">
        {/* BTC 5-min badge */}
        {isBtc5min && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <span className="inline-block w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
              BTC 5 DAKİKA
            </span>
          </div>
        )}

        {/* Question */}
        <h3 className={`font-semibold text-slate-100 leading-[1.4] line-clamp-2 mb-3 ${isBtc5min ? 'text-xs' : 'text-[12px]'}`}>
          {isBtc5min ? `BTC ${questionTr}` : questionTr}
        </h3>

        {/* Outcomes */}
        <div className="flex gap-1.5">
          {outcomeList.map((outcome, i) => {
            const price = priceList[i] || 0;
            const pctBar = Math.max(2, Math.min(100, price * 100));
            const change = priceChange?.[i];

            return (
              <div
                key={i}
                className="flex-1 rounded-lg p-2 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                style={{ backgroundColor: getBgColor(i) }}
                onClick={() => setModal({ choice: i })}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {change === 'up' && <span className="text-[10px] text-emerald-400 shrink-0">▲</span>}
                    {change === 'down' && <span className="text-[10px] text-rose-400 shrink-0">▼</span>}
                    <span className={`text-[10px] font-bold tracking-wide truncate ${getLabelColor(i)}`}>
                      {getLabel(i)}
                    </span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 transition-colors duration-300 ${
                    change === 'up' ? 'text-emerald-300' :
                    change === 'down' ? 'text-rose-300' :
                    `opacity-80 ${getLabelColor(i)}`
                  }`}>
                    {formatPct(price)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getBarBg(i) }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pctBar}%`, backgroundColor: getBarColor(i) }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta */}
        <div className="mt-3 pt-2.5 flex items-center justify-between text-[10px] text-slate-600"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBtc5min ? 'bg-orange-400' : active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            <span>{isBtc5min ? btcTimeLeft() : active ? 'Aktif' : 'Kapalı'}</span>
          </div>
          {!isBtc5min && <span>{timeLeft()}</span>}
        </div>

        {/* Stats */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-600">
          <span>Lik: <span className="text-slate-500">{formatMoney(liquidityNum)}</span></span>
          <span>·</span>
          <span>24s: <span className="text-slate-500">{formatMoney(volumeNum)}</span></span>
        </div>

        {hasLive && !isBtc5min && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-blue-400/50">
            <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            Canlı fiyat
          </div>
        )}
      </div>
    </div>

    {modal && (
      <TradeModal market={market} choice={modal.choice} onClose={() => setModal(null)} />
    )}
    </>
  );
}
