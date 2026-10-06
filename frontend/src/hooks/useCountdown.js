import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useCountdown — deadline-based countdown for timed interview answers (#41)
 *
 * The remaining time is derived from an absolute deadline rather than by
 * decrementing a counter each tick. Background tabs throttle timers hard, so a
 * decrementing counter drifts and would silently hand candidates extra time; a
 * deadline stays correct no matter how late the interval fires.
 */

/** @param {object} options @param {() => void} [options.onExpire] */
export default function useCountdown({
  durationMs = 0,
  autoStart = false,
  onExpire = null,
  tickMs = 250,
} = {}) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);

  const deadlineRef = useRef(null);
  const pausedRemainingRef = useRef(durationMs);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const readRemaining = useCallback(() => {
    if (deadlineRef.current === null) return pausedRemainingRef.current;
    return Math.max(0, deadlineRef.current - Date.now());
  }, []);

  const tick = useCallback(() => {
    const left = readRemaining();
    setRemainingMs(left);

    if (left <= 0) {
      setRunning(false);
      deadlineRef.current = null;
      pausedRemainingRef.current = 0;
      if (!expiredRef.current) {
        expiredRef.current = true;
        setExpired(true);
        onExpireRef.current?.();
      }
    }
  }, [readRemaining]);

  useEffect(() => {
    if (!running) return undefined;

    const id = setInterval(tick, tickMs);
    // Also correct immediately so a throttled tab catches up on refocus.
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, tick, tickMs]);

  const start = useCallback(
    (ms = durationMs) => {
      const total = Number(ms) > 0 ? Number(ms) : durationMs;
      if (total <= 0) return;
      pausedRemainingRef.current = total;
      deadlineRef.current = Date.now() + total;
      expiredRef.current = false;
      setExpired(false);
      setRemainingMs(total);
      setRunning(true);
    },
    [durationMs]
  );

  const pause = useCallback(() => {
    const left = readRemaining();
    pausedRemainingRef.current = left;
    deadlineRef.current = null;
    setRemainingMs(left);
    setRunning(false);
  }, [readRemaining]);

  const resume = useCallback(() => {
    if (pausedRemainingRef.current <= 0) return;
    deadlineRef.current = Date.now() + pausedRemainingRef.current;
    expiredRef.current = false;
    setExpired(false);
    setRunning(true);
  }, []);

  const reset = useCallback(
    (ms = durationMs) => {
      deadlineRef.current = null;
      pausedRemainingRef.current = Number(ms) > 0 ? Number(ms) : durationMs;
      expiredRef.current = false;
      setExpired(false);
      setRemainingMs(pausedRemainingRef.current);
      setRunning(false);
    },
    [durationMs]
  );

  const toggle = useCallback(() => {
    if (running) pause();
    else if (pausedRemainingRef.current > 0) resume();
    else start();
  }, [running, pause, resume, start]);

  useEffect(() => {
    if (autoStart && durationMs > 0) start();
  }, [autoStart, durationMs, start]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = durationMs > 0 ? Math.min(1, Math.max(0, remainingMs / durationMs)) : 0;

  return {
    remainingMs,
    seconds,
    minutes: Math.floor(seconds / 60),
    secondsPart: seconds % 60,
    progress,
    running,
    expired,
    start,
    pause,
    resume,
    reset,
    toggle,
  };
}

export const formatCountdown = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};