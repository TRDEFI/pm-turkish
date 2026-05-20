'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

function formatPrice(p) {
  if (p >= 1000) return `$${p.toFixed(0)}`;
  return `$${p.toFixed(2)}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return { min: '00', sec: '00', red: true };
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return { min, sec, red: ms < 60000 };
}

export default function CandlestickChart({ pair = 'BTC_USDT', height = 260, threshold = null, deadline = null }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const thresholdLineRef = useRef(null);
  const [price, setPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [changeAmt, setChangeAmt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const colorRef = useRef('#F59E0B');

  // Fetch last 5 x 1m candles — tight window = narrow Y-axis
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(
        `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=1m&limit=5`
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // Gate: [ts_sec, quote_vol, close, high, low, open, base_vol, is_closed]
      const candles = data
        .filter(c => c[7] === true)
        .map(c => ({
          time: parseInt(c[0]),
          value: parseFloat(c[2]),
        }));

      if (lineSeriesRef.current && candles.length > 0) {
        lineSeriesRef.current.setData(candles);
        const last = candles[candles.length - 1];
        const first = candles[0];
        setPrice(last.value);
        setPrevPrice(first.value);

        const chg = parseFloat(((last.value - first.value) / first.value * 100).toFixed(3));
        const chgAmt = last.value - first.value;
        setChange(chg);
        setChangeAmt(chgAmt);

        const isUp = chg >= 0;
        colorRef.current = isUp ? '#22C55E' : '#EF4444';
        lineSeriesRef.current.applyOptions({ color: colorRef.current });

        // Tight X-axis
        chartRef.current.timeScale().fitContent();
      }

      setLoading(false);
    } catch (err) {
      console.error('[LineChart] load error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [pair]);

  // Gate.io WebSocket for real-time price updates
  const connectWS = useCallback(() => {
    const ws = new WebSocket(`wss://api.gateio.ws/ws/v4/`, 'gateio-ws');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel: 'spot.candlesticks',
        event: 'subscribe',
        payload: [pair, '1m'],
      }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.channel !== 'spot.candlesticks') return;
        const tick = msg.result;
        if (!tick || !tick.c) return;

        const bar = {
          time: parseInt(tick.t),
          value: parseFloat(tick.c),
        };

        if (lineSeriesRef.current) {
          lineSeriesRef.current.update(bar);
        }

        const newPrice = bar.value;
        setPrice(newPrice);

        setPrevPrice(p => {
          if (p) {
            const chg = parseFloat(((newPrice - p) / p * 100).toFixed(3));
            const chgAmt = newPrice - p;
            setChange(chg);
            setChangeAmt(chgAmt);
            const isUp = chg >= 0;
            const newColor = isUp ? '#22C55E' : '#EF4444';
            if (newColor !== colorRef.current) {
              colorRef.current = newColor;
              lineSeriesRef.current.applyOptions({ color: newColor });
            }
          }
          return newPrice;
        });
      } catch {}
    };

    ws.onerror = () => ws.close();
    ws.onclose = () => { reconnectRef.current = setTimeout(connectWS, 3000); };
    wsRef.current = ws;
  }, [pair]);

  // Countdown timer — per second
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = new Date(deadline) - Date.now();
      setCountdown(ms);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  useEffect(() => {
    loadHistory();
    connectWS();
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); }
    };
  }, [loadHistory, connectWS]);

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
        fontSize: 11,
        fontFamily: 'DM Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(243,244,246,0.06)' },
        horzLines: { color: 'rgba(243,244,246,0.06)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(245,158,11,0.4)', width: 1, style: 2, labelBackgroundColor: '#f97316' },
        horzLine: { color: 'rgba(245,158,11,0.4)', width: 1, style: 2, labelBackgroundColor: '#f97316' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, axisPressedMouseMove: true },
    });

    // Pure line series — Polymarket amber color
    const lineSeries = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      priceLineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: '#F59E0B',
    });

    // Threshold / target line
    if (threshold) {
      const priceLine = lineSeries.createPriceLine({
        price: threshold,
        color: '#9CA3AF',
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: 'Hedef',
      });
      thresholdLineRef.current = priceLine;
    }

    lineSeriesRef.current = lineSeries;
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      lineSeriesRef.current = null;
      chartRef.current = null;
    };
  }, [height, threshold]);

  const cd = countdown !== null ? formatCountdown(countdown) : null;
  const priceColor = change > 0 ? '#22C55E' : change < 0 ? '#EF4444' : '#F59E0B';
  const changeSign = change > 0 ? '+' : '';
  const changeAmtSign = changeAmt > 0 ? '+' : '';

  return (
    <div className="relative">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-white tabular-nums">
            {price ? formatPrice(price) : '—'}
          </span>
          {change != null && (
            <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
              style={{
                color: priceColor,
                background: `${priceColor}18`,
                textShadow: `0 0 12px ${priceColor}50`,
                border: `1px solid ${priceColor}30`,
              }}>
              {changeAmtSign}{changeAmt ? `$${changeAmt.toFixed(2)}` : ''} ({changeSign}{change}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Countdown timer */}
          {cd && (
            <div className="flex items-center gap-1">
              <span
                className="text-lg font-black tabular-nums"
                style={{ color: cd.red ? '#DC2626' : '#EF4444', textShadow: cd.red ? '0 0 15px #DC2626' : 'none' }}>
                {cd.min}
              </span>
              <span className="text-lg font-black" style={{ color: cd.red ? '#DC2626' : '#EF4444' }}>:</span>
              <span
                className="text-lg font-black tabular-nums"
                style={{ color: cd.red ? '#DC2626' : '#EF4444', textShadow: cd.red ? '0 0 15px #DC2626' : 'none' }}>
                {cd.sec}
              </span>
              <span className="text-[9px] font-bold uppercase" style={{ color: cd.red ? '#DC2626' : '#EF4444' }}>
                {cd.red ? 'DK' : 'SN'}
              </span>
            </div>
          )}

          {/* Live dot */}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
            <span className="text-[10px] text-slate-500">CANLI</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(7,8,16,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-6 h-6 border-[2px] border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(7,8,16,0.7)' }}>
          <span className="text-xs text-slate-500">Grafik yüklenemedi</span>
        </div>
      )}
    </div>
  );
}
