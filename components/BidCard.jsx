'use client';

import { useState, useRef, useEffect } from 'react';
import { t } from '../lib/translations';
import { translateQuestion } from '../lib/autoTranslate';

/* ─── Animated number ─── */
function AnimatedNumber({ value, decimals = 2, color }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setDisplay(value);
      prevRef.current = value;
    }
  }, [value]);

  return (
    <span className="tabular-nums" style={{ color }}>
      {typeof display === 'number' ? display.toFixed(decimals) : display}
    </span>
  );
}

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
      style={{ backgroundColor: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="rounded-2xl border w-[420px] max-w-[95vw] overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0a0d15 0%, #0d1020 100%)',
          borderColor: choice === 0 ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)',
          boxShadow: choice === 0
            ? '0 0 60px rgba(52,211,153,0.15), 0 25px 50px rgba(0,0,0,0.5)'
            : '0 0 60px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.5)',
        }}>
        {/* Glowing top border */}
        <div style={{
          height: '2px',
          background: choice === 0
            ? 'linear-gradient(90deg, transparent, #34d399, transparent)'
            : 'linear-gradient(90deg, transparent, #ef4444, transparent)',
          boxShadow: choice === 0
            ? '0 0 20px #34d399, 0 0 40px #34d39940'
            : '0 0 20px #ef4444, 0 0 40px #ef444440',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-sm font-semibold text-white leading-tight">{questionTr}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none transition-colors shrink-0 ml-2">×</button>
        </div>

        {/* Choice + Price */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              choice === 0
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
              style={{ textShadow: choice === 0 ? '0 0 20px #34d399' : '0 0 20px #ef4444' }}>
              {choice === 0 ? '✓ EVET' : '✗ HAYIR'}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white tabular-nums"
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.3)' }}>
                {(price * 100).toFixed(1)}¢
              </div>
            </div>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="px-5 pb-3">
          <label className="text-[11px] text-slate-500 mb-2 block uppercase tracking-wider">Ödeme Yöntemi</label>
          <div className="flex gap-2">
            {[
              { name: 'USDT', icon: '₮', bg: '#26a17b' },
              { name: 'USDC', icon: '$', bg: '#2775ca' },
              { name: 'DAI',  icon: '◈', bg: '#f5af31' },
            ].map((c, i) => (
              <div key={c.name}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  i === 0
                    ? 'border-emerald-500/40 bg-emerald-500/8'
                    : 'border-white/8 bg-white/3 hover:border-white/15'
                }`}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                  style={{ backgroundColor: c.bg }}>{c.icon}</div>
                <span className="text-xs font-bold text-white">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="px-5 pb-3">
          <label className="text-[11px] text-slate-500 mb-2 block uppercase tracking-wider">Miktar (USD)</label>
          <div className="relative">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl px-4 py-3 text-white text-lg font-mono placeholder:text-slate-700 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: amount ? (choice === 0 ? '0 0 20px rgba(52,211,153,0.1)' : '0 0 20px rgba(239,68,68,0.1)') : 'none',
              }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold">USD</span>
          </div>
        </div>

        {/* Estimated Return */}
        {amount && parseFloat(amount) > 0 && (
          <div className="mx-5 mb-4 p-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: choice === 0
                ? 'inset 0 0 20px rgba(52,211,153,0.05)'
                : 'inset 0 0 20px rgba(239,68,68,0.05)',
            }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Tahmini Getiri</span>
              <span className="text-white font-black text-base tabular-nums">${potentialReturn}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-slate-400 text-sm font-bold transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            İptal
          </button>
          <button className="flex-1 py-3 rounded-xl text-white text-sm font-black transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: choice === 0
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: choice === 0
                ? '0 0 30px rgba(34,197,94,0.4)'
                : '0 0 30px rgba(239,68,68,0.4)',
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

  const getLabelColor = (i) => !isMatchup && i === 0 ? 'text-emerald-400' : i === 0 ? 'text-emerald-400' : 'text-rose-400';
  const getBgColor = (i) => !isMatchup && i === 0 ? 'rgba(52,211,153,0.07)' : i === 0 ? 'rgba(52,211,153,0.07)' : 'rgba(244,63,94,0.07)';
  const getBarBg = (i) => !isMatchup && i === 0 ? 'rgba(52,211,153,0.15)' : i === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(244,63,94,0.15)';
  const getBarColor = (i) => !isMatchup && i === 0 ? '#34d399' : i === 0 ? '#34d399' : '#f43f5e';
  const getLabel = (i) => isMatchup ? rawOutcomes[i] || `Sonuç ${i + 1}` : (i === 0 ? 'EVET' : 'HAYIR');

  return (
    <>
    <div
      className="group relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, rgba(10,13,21,0.95) 0%, rgba(13,16,32,0.95) 100%)',
        borderColor: hasLive ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
        boxShadow: hasLive
          ? '0 0 0 1px rgba(59,130,246,0.1), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        '--glow': hasLive ? 'rgba(59,130,246,0.15)' : 'rgba(129,140,248,0.1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = hasLive ? 'rgba(59,130,246,0.5)' : 'rgba(129,140,248,0.3)';
        e.currentTarget.style.boxShadow = hasLive
          ? '0 0 30px rgba(59,130,246,0.2), 0 8px 40px rgba(0,0,0,0.5)'
          : '0 0 30px rgba(129,140,248,0.15), 0 8px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = hasLive ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)';
        e.currentTarget.style.boxShadow = hasLive
          ? '0 0 0 1px rgba(59,130,246,0.1), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(0,0,0,0.3)';
      }}
    >
      {/* Neon top line for live */}
      {hasLive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
          boxShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f680',
        }} />
      )}

      <div className="p-4">
        {/* BTC 5-min badge */}
        {isBtc5min && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
              style={{
                background: 'rgba(249,115,22,0.1)',
                color: '#fbbf24',
                border: '1px solid rgba(249,115,22,0.3)',
                boxShadow: '0 0 10px rgba(249,115,22,0.2)',
              }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: '#fbbf24', boxShadow: '0 0 6px #fbbf24', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
              BTC 5 DAKİKA
            </span>
          </div>
        )}

        {/* Question */}
        <h3 className={`font-semibold text-slate-100 leading-[1.4] line-clamp-2 mb-3 ${isBtc5min ? 'text-[11px]' : 'text-[12px]'}`}
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
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
                className="flex-1 rounded-xl p-2.5 cursor-pointer hover:opacity-80 active:scale-[0.97] transition-all"
                style={{ backgroundColor: getBgColor(i) }}
                onClick={() => setModal({ choice: i })}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {change === 'up' && <span className="text-[10px] text-emerald-400 shrink-0" style={{ textShadow: '0 0 8px #34d399' }}>▲</span>}
                    {change === 'down' && <span className="text-[10px] text-rose-400 shrink-0" style={{ textShadow: '0 0 8px #f43f5e' }}>▼</span>}
                    <span className="text-[10px] font-black tracking-wide truncate uppercase"
                      style={{ color: getLabelColor(i), textShadow: i === 0 ? '0 0 10px rgba(52,211,153,0.5)' : '0 0 10px rgba(244,63,94,0.5)' }}>
                      {getLabel(i)}
                    </span>
                  </div>
                  <span className={`text-sm font-black tabular-nums shrink-0 transition-colors duration-300 ${
                    change === 'up' ? 'text-emerald-300' :
                    change === 'down' ? 'text-rose-300' : getLabelColor(i)
                  }`}
                    style={{ textShadow: change === 'up' ? '0 0 15px rgba(52,211,153,0.6)' : change === 'down' ? '0 0 15px rgba(244,63,94,0.6)' : 'none' }}>
                    {formatPct(price)}
                  </span>
                </div>
                {/* Neon progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getBarBg(i) }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pctBar}%`,
                      background: getBarColor(i),
                      boxShadow: `0 0 8px ${getBarColor(i)}, 0 0 16px ${getBarColor(i)}60`,
                    }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta */}
        <div className="mt-3 pt-2.5 flex items-center justify-between text-[10px] text-slate-600"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBtc5min ? '' : hasLive ? 'animate-pulse' : ''}`}
              style={{
                background: isBtc5min ? '#fbbf24' : active ? '#34d399' : '#475569',
                boxShadow: isBtc5min ? '0 0 6px #fbbf24' : active ? '0 0 6px #34d399' : 'none',
              }} />
            <span className={isBtc5min ? 'text-amber-400' : active ? 'text-emerald-400/70' : 'text-slate-600'}>
              {isBtc5min ? btcTimeLeft() : active ? 'Aktif' : 'Kapalı'}
            </span>
          </div>
          {!isBtc5min && <span className="text-slate-600">{timeLeft()}</span>}
        </div>

        {/* Stats */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-600">
          <span>Lik: <span className="text-slate-500 font-medium">{formatMoney(liquidityNum)}</span></span>
          <span>·</span>
          <span>24s: <span className="text-slate-500 font-medium">{formatMoney(volumeNum)}</span></span>
        </div>

        {hasLive && !isBtc5min && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-blue-400/50">
            <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-pulse"
              style={{ boxShadow: '0 0 6px #3b82f6' }} />
            Canlı fiyat
          </div>
        )}
      </div>
    </div>

    {modal && (
      <TradeModal market={market} choice={modal.choice} onClose={() => setModal(null)} />
    )}

    <style>{`
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
        50% { opacity: 0.6; box-shadow: 0 0 12px currentColor; }
      }
    `}</style>
    </>
  );
}
