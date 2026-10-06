import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useMicMeter — live microphone level metering with silence detection (#43, #59)
 *
 * The Web Speech API tells us *what* was said but nothing about whether the mic
 * is actually hearing anything, which leaves candidates guessing during a
 * simulated interview. This hook owns the Web Audio side only: it opens a
 * getUserMedia stream, runs it through an AnalyserNode and exposes an RMS level
 * plus a running silence timer. Speech recognition stays in the page component
 * so the two lifecycles remain independently controllable.
 *
 * Everything here is best-effort. A denied or missing microphone downgrades to
 * an error status; it never throws into the interview flow.
 */

/** RMS above this counts as the candidate speaking. */
const DEFAULT_SPEAKING_THRESHOLD = 0.045;
/** Continuous silence (ms) before we flag the answer as finished. */
const DEFAULT_SILENCE_TIMEOUT_MS = 3500;
/** Below this the meter is treated as absolute silence (room tone / muted). */
const FLOOR_LEVEL = 0.008;

const getAudioContextClass = () =>
  typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;

export default function useMicMeter({
  speakingThreshold = DEFAULT_SPEAKING_THRESHOLD,
  silenceTimeoutMs = DEFAULT_SILENCE_TIMEOUT_MS,
  onSilenceTimeout = null,
} = {}) {
  const [status, setStatus] = useState('idle'); // idle | requesting | listening | muted | denied | unsupported | error
  const [level, setLevel] = useState(0);
  const [isSilent, setIsSilent] = useState(false);
  const [silenceMs, setSilenceMs] = useState(0);
  const [error, setError] = useState(null);
  const [hasHeardAudio, setHasHeardAudio] = useState(false);

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const dataRef = useRef(null);
  const silenceStartRef = useRef(null);
  const lastLevelRef = useRef(0);
  const firedRef = useRef(false);
  // The rAF loop keeps the tick closure it was started with, so anything the
  // loop branches on has to live in a ref. Reading `hasHeardAudio` from state
  // here would capture the value from mount and silence detection would never
  // fire.
  const hasHeardAudioRef = useRef(false);
  const onSilenceTimeoutRef = useRef(onSilenceTimeout);

  useEffect(() => {
    onSilenceTimeoutRef.current = onSilenceTimeout;
  }, [onSilenceTimeout]);

  const isSupported = Boolean(getAudioContextClass() && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia);

  const teardown = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* track already ended */
        }
      });
      streamRef.current = null;
    }
    if (contextRef.current) {
      try {
        // Closing releases the audio hardware; suspend alone leaks the context.
        contextRef.current.close();
      } catch {
        /* already closed */
      }
      contextRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
    silenceStartRef.current = null;
    lastLevelRef.current = 0;
    setLevel(0);
    setSilenceMs(0);
    setIsSilent(false);
  }, []);

  useEffect(() => teardown, [teardown]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const buffer = dataRef.current;
    if (!analyser || !buffer) return;

    analyser.getByteTimeDomainData(buffer);

    // RMS over the time-domain window: cheap and stable enough for a meter.
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = (buffer[i] - 128) / 128;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    // Exponential smoothing stops the bar from strobing on every frame.
    const smoothed = lastLevelRef.current * 0.6 + rms * 0.4;
    lastLevelRef.current = smoothed;
    setLevel(Math.min(1, smoothed * 3));

    const now = performance.now();
    if (rms >= speakingThreshold) {
      silenceStartRef.current = null;
      setIsSilent(false);
      setSilenceMs(0);
      if (!hasHeardAudioRef.current) {
        hasHeardAudioRef.current = true;
        setHasHeardAudio(true);
      }
      firedRef.current = false;
    } else {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = now;
      }
      const elapsed = now - silenceStartRef.current;
      setSilenceMs(elapsed);
      // Never report silence before the candidate has actually spoken, otherwise
      // the meter flags "answer finished" on an empty room.
      const timedOut = hasHeardAudioRef.current && elapsed >= silenceTimeoutMs;
      setIsSilent(timedOut);

      if (timedOut && !firedRef.current) {
        firedRef.current = true;
        onSilenceTimeoutRef.current?.({ silenceMs: elapsed });
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [speakingThreshold, silenceTimeoutMs]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported');
      setError('This browser does not expose microphone metering (AudioContext / getUserMedia unavailable). Dictation still works.');
      return false;
    }
    if (status === 'listening' || status === 'requesting') return true;

    // A previous stream may still be open (e.g. resuming from a pause), and
    // getUserMedia would otherwise stack a second mic on top of it.
    if (streamRef.current || contextRef.current) teardown();

    setStatus('requesting');
    setError(null);
    firedRef.current = false;
    hasHeardAudioRef.current = false;
    setHasHeardAudio(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioContextClass = getAudioContextClass();
      const context = new AudioContextClass();
      contextRef.current = context;
      if (context.state === 'suspended') {
        await context.resume();
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      // Light smoothing: enough to stop jitter without hiding transients.
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      // Deliberately not connected to context.destination — that would echo the
      // candidate's own voice back through their speakers.
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.fftSize);

      setStatus('listening');
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (err) {
      teardown();
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setStatus('denied');
        setError(
          'Microphone access is blocked, so no live meter or silence detection is available. Click the padlock in the address bar, allow the microphone for this site, then press Retry. Speech-to-text needs the same permission.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setStatus('error');
        setError('No microphone was found on this device. You can still type your answer.');
      } else {
        setStatus('error');
        setError(`Could not start the audio meter: ${err?.message || 'unknown error'}`);
      }
      return false;
    }
  }, [isSupported, status, teardown, tick]);

  const stop = useCallback(() => {
    teardown();
    hasHeardAudioRef.current = false;
    setHasHeardAudio(false);
    setStatus('idle');
  }, [teardown]);

  /**
   * Pause capture without tearing the stream down, so unmuting is instant.
   * Tracks are disabled rather than stopped to avoid a permission re-prompt.
   */
  const mute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    if (contextRef.current?.state === 'running') {
      contextRef.current.suspend();
    }
    setLevel(0);
    setIsSilent(false);
    setSilenceMs(0);
    setStatus('muted');
  }, []);

  const unmute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    contextRef.current?.resume();
    silenceStartRef.current = null;
    setStatus('listening');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const toggleMute = useCallback(() => {
    if (status === 'muted') unmute();
    else if (status === 'listening') mute();
  }, [status, mute, unmute]);

  /** Peak level seen since start, for the "clipping" warning. */
  const isClipping = level > 0.92;
  const isEffectivelySilent = status === 'listening' && level < FLOOR_LEVEL;

  return {
    status,
    level,
    isSilent,
    silenceMs,
    error,
    hasHeardAudio,
    isClipping,
    isEffectivelySilent,
    isSupported,
    start,
    stop,
    mute,
    unmute,
    toggleMute,
    silenceTimeoutMs,
  };
}