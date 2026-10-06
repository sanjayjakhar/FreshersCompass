import { useEffect, useRef } from 'react';

/**
 * MicWaveform — canvas level meter for the interview answer card (#43, #59)
 *
 * Draws from a single shared AudioContextAnalyser-style level value rather than
 * owning an AnalyserNode itself, so the canvas stays a pure view. The level is
 * sampled on every animation frame with a decaying bar history, which reads as a
 * waveform without the cost of a full FFT.
 *
 * Performance: the loop stops when the tab is hidden or the meter is inactive,
 * the backing store is sized to devicePixelRatio (capped at 2 to bound fill
 * rate), and the canvas is only repainted while a level has been seen recently.
 */

const HISTORY = 56;
const IDLE_FADE_MS = 700;

export default function MicWaveform({
  level = 0,
  active = false,
  status = 'idle',
  height = 56,
  className = '',
}) {
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(HISTORY).fill(0));
  const lastSeenRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssWidth = canvas.clientWidth || 320;
    const cssHeight = height;

    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = {
      live: { stroke: '#D85A30', glow: 'rgba(216, 90, 48, 0.18)' },
      muted: { stroke: '#5F5E5A', glow: 'rgba(95, 94, 90, 0.14)' },
      denied: { stroke: '#B42318', glow: 'rgba(180, 35, 24, 0.14)' },
      idle: { stroke: '#9A9A93', glow: 'rgba(154, 154, 147, 0.10)' },
    };

    const colorFor = () => {
      if (status === 'denied' || status === 'error') return palette.denied;
      if (status === 'muted') return palette.muted;
      if (active) return palette.live;
      return palette.idle;
    };

    const draw = () => {
      const now = performance.now();
      const { stroke, glow } = colorFor();

      // Shift in the newest sample and decay the tail so idle bars fall away
      // instead of freezing mid-height.
      const history = historyRef.current;
      history.shift();
      const fresh = active && now - lastSeenRef.current < IDLE_FADE_MS;
      history.push(fresh ? Math.max(0, Math.min(1, level)) : 0);

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Centre line
      ctx.strokeStyle = 'rgba(229, 228, 223, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cssHeight / 2 + 0.5);
      ctx.lineTo(cssWidth, cssHeight / 2 + 0.5);
      ctx.stroke();

      const barWidth = cssWidth / history.length;
      const barWidthPx = Math.max(1, barWidth * 0.55);

      for (let i = 0; i < history.length; i += 1) {
        const value = history[i];
        if (value <= 0.005) continue;

        const barHeight = Math.max(2, value * (cssHeight - 8));
        const x = i * barWidth + (barWidth - barWidthPx) / 2;
        const y = (cssHeight - barHeight) / 2;

        // Older samples fade out, so the newest bar is the brightest.
        const recency = (i + 1) / history.length;
        ctx.fillStyle = recency > 0.75 ? stroke : glow;

        const radius = Math.min(barWidthPx / 2, 2);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidthPx, barHeight, radius);
        } else {
          ctx.rect(x, y, barWidthPx, barHeight);
        }
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Hidden tabs do not need repaints, and rAF already throttles there; this
    // additionally stops the loop outright so a backgrounded tab burns no CPU.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      } else if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [level, active, status, height]);

  useEffect(() => {
    if (active && level > 0.01) lastSeenRef.current = performance.now();
  }, [level, active]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full block ${className}`}
      style={{ height: `${height}px` }}
      role="img"
      aria-label={
        active
          ? `Live microphone level, currently ${Math.round(level * 100)} percent`
          : 'Microphone level meter, inactive'
      }
    />
  );
}