'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

function formatPrice(p) {
  if (p >= 1000) return `$${p.toFixed(0)}`;
  return `$${p.toFixed(2)}`;
}

export default function CandlestickChart({ pair = 'BTC_USDT', height = 260 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const colorRef = useRef('#34d399');

  // Fetch last 20 x 1m candles — tight window for narrow Y-axis
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(
        `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=1m&limit=20`
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // Gate: [ts_sec, quote_vol, close, high, low, open, base_vol, is_closed]
      const candles = data
        .filter(c => c[7] === true)
        .map(c => ({
          time: parseInt(c[0]),
          value: parseFloat(c[2]), // close price
        }));

      if (lineSeriesRef.current && candles.length > 0) {
        lineSeriesRef.current.setData(candles);
        const last = candles[candles.length - 1];
        const first = candles[0];
        setPrice(last.value);

        const chg = ((last.value - first.value) / first.value * 100).toFixed(2);
        setChange(chg);

        // Line color based on direction
        const isUp = last.value >= first.value;
        colorRef.current = isUp ? '#34d399' : '#f43f5e';
        lineSeriesRef.current.applyOptions({
          color: colorRef.current,
          lineStyle: 0,
        });
        setChange(chg);

        // Let Y-axis auto-fit to visible data (tight range)
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

        setPrice(bar.value);

        // Update color on direction change
        const prev = colorRef.current;
        const isUp = bar.value >= (tick.o ? parseFloat(tick.o) : bar.value);
        const newColor = isUp ? '#34d399' : '#f43f5e';
        if (newColor !== prev) {
          colorRef.current = newColor;
          lineSeriesRef.current.applyOptions({ color: newColor });
        }
      } catch {}
    };

    ws.onerror = () => ws.close();
    ws.onclose = () => { reconnectRef.current = setTimeout(connectWS, 3000); };
    wsRef.current = ws;
  }, [pair]);

  useEffect(() => {
    loadHistory();
    connectWS();
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); }
    };
  }, [loadHistory, connectWS]);

  // Init chart after mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'DM Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(251,191,36,0.4)', width: 1, style: 2, labelBackgroundColor: '#f97316' },
        horzLine: { color: 'rgba(251,191,36,0.4)', width: 1, style: 2, labelBackgroundColor: '#f97316' },
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

    // Pure line series — close price only (Polymarket-style)
    const lineSeries = chart.addLineSeries({
      color: '#34d399',
      lineWidth: 2,
      priceLineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: '#f97316',
    });

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
  }, [height]);

  const priceColor = change > 0 ? '#34d399' : change < 0 ? '#f43f5e' : '#94a3b8';
  const changeSign = change > 0 ? '+' : '';

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-white tabular-nums">
            {price ? formatPrice(price) : '—'}
          </span>
          {change != null && (
            <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
              style={{ color: priceColor, background: `${priceColor}15`, textShadow: `0 0 12px ${priceColor}60` }}>
              {changeSign}{change}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
          <span className="text-[10px] text-slate-500">CANLI</span>
        </div>
      </div>

      {/* Line chart */}
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
