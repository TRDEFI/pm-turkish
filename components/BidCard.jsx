'use client';

import { t } from '../lib/translations';
import { translateQuestion } from '../lib/autoTranslate';

export default function BidCard({ market, priceChange }) {
  const {
    question,
    outcomes,
    outcomePrices,
    liquidityNum,
    volumeNum,
    endDate,
    active = true,
    _livePrices,
  } = market;

  const questionTr = translateQuestion(question);
  const isBtc5min = market.isBtc5min === true;

  // Parse outcomes
  const rawOutcomes = JSON.parse(outcomes || '[]');
  const outcomeList = rawOutcomes.slice(0, 2);

  // Use live CLOB prices when available, fallback to Gamma
  const priceList = (_livePrices && _livePrices.length === 2)
    ? _livePrices
    : JSON.parse(outcomePrices || '[]').map(Number).slice(0, 2);

  // Detect sports matchups (outcomes are team names, not Yes/No)
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
    return `${h}sa`;
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

  // Outcome label colors
  const getLabelColor = (i) => {
    if (!isMatchup) return i === 0 ? 'text-emerald-400' : 'text-rose-400';
    return 'text-blue-400';
  };

  const getBgColor = (i) => {
    if (!isMatchup) return i === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)';
    return 'rgba(59,130,246,0.08)';
  };

  const getBarBg = (i) => {
    if (!isMatchup) return i === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
    return 'rgba(59,130,246,0.2)';
  };

  const getBarColor = (i) => {
    if (!isMatchup) return i === 0 ? '#10b981' : '#f43f5e';
    return '#3b82f6';
  };

  const getLabel = (i) => {
    if (isMatchup) return rawOutcomes[i] || `Sonuç ${i + 1}`;
    return i === 0 ? 'EVET' : 'HAYIR';
  };

  const shortLabel = (label) => {
    if (!isMatchup) return label;
    const parts = label.trim().split(/\s+(?=[A-Z])/);
    return parts.length > 1 ? parts.slice(-2).join(' ') : label;
  };

  return (
    <div className={`bg-slate-800/90 rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg ${
      hasLive ? 'border-blue-500/20 hover:border-blue-400/40'
      : isBtc5min ? 'border-amber-500/20 hover:border-amber-400/40'
      : 'border-slate-700/50 hover:border-slate-500/50'
    }`}>
      <div className="p-4">
        {/* BTC 5-min badge */}
        {isBtc5min && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="inline-block w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span>
              BTC 5 DAKİKA
            </span>
          </div>
        )}

        {/* Question */}
        <h3 className={`font-semibold text-slate-100 leading-[1.4] line-clamp-2 mb-3 ${
          isBtc5min ? 'text-xs' : 'text-[13px]'
        }`}>
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
                className="flex-1 rounded-lg p-2"
                style={{ backgroundColor: getBgColor(i) }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {change === 'up' && <span className="text-[10px] text-emerald-400 shrink-0">▲</span>}
                    {change === 'down' && <span className="text-[10px] text-rose-400 shrink-0">▼</span>}
                    <span className={`text-[10px] font-bold tracking-wide truncate ${getLabelColor(i)}`}>
                      {shortLabel(getLabel(i))}
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
                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: getBarBg(i) }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pctBar}%`, backgroundColor: getBarColor(i) }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta line */}
        <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              isBtc5min ? 'bg-amber-400'
              : active ? 'bg-emerald-400' : 'bg-slate-600'
            }`} />
            <span>{isBtc5min ? btcTimeLeft() : active ? 'Aktif' : 'Kapalı'}</span>
          </div>
          {!isBtc5min && <span>{timeLeft()}</span>}
        </div>

        {/* Stats */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
          <span>Lik: <span className="text-slate-400">{formatMoney(liquidityNum)}</span></span>
          <span className="text-slate-600">·</span>
          <span>24s: <span className="text-slate-400">{formatMoney(volumeNum)}</span></span>
        </div>

        {/* Live badge */}
        {hasLive && !isBtc5min && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-blue-400/60">
            <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            Canlı fiyat
          </div>
        )}
      </div>
    </div>
  );
}
