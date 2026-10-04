import { formatCountdown } from '../hooks/useCountdown';

/**
 * TimerGauge — circular countdown for the interview answer card (#41)
 *
 * Colour communicates urgency without needing to read the digits: calm blue
 * while comfortable, amber inside the 30s warning window, red pulse for the
 * final 10s.
 */

const SIZE = 92;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const WARNING_THRESHOLD_S = 30;
export const DANGER_THRESHOLD_S = 10;

const toneFor = (seconds) => {
  if (seconds <= DANGER_THRESHOLD_S) return 'danger';
  if (seconds <= WARNING_THRESHOLD_S) return 'warning';
  return 'normal';
};

const TONES = {
  normal: { stroke: '#185FA5', text: 'text-text-dark', label: 'text-text-muted' },
  warning: { stroke: '#B98900', text: 'text-warning', label: 'text-warning' },
  danger: { stroke: '#B42318', text: 'text-red-700', label: 'text-red-700' },
};

export default function TimerGauge({
  seconds = 0,
  progress = 0,
  running = false,
  paused = false,
  totalSeconds = 0,
  onToggle = null,
  onReset = null,
  className = '',
}) {
  const tone = TONES[toneFor(seconds)];
  const dash = Math.max(0, Math.min(1, progress)) * CIRCUMFERENCE;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={`w-full h-full -rotate-90 ${tone === 'danger' && running ? 'animate-pulse' : ''}`}
          role="timer"
          aria-live="off"
          aria-label={`${formatCountdown(seconds)} remaining${paused ? ', paused' : ''}`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#E5E4DF"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            className="transition-[stroke-dasharray] duration-300 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-base font-black font-mono leading-none ${tone.text}`}>
            {formatCountdown(seconds)}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${tone.label}`}>
            {paused ? 'Paused' : seconds <= 0 ? 'Time up' : running ? 'Left' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            disabled={seconds <= 0 && !running}
            className="text-[11px] font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {running ? 'Pause timer' : 'Resume timer'}
          </button>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="block text-[11px] font-bold text-text-muted hover:text-text-dark hover:underline mt-0.5"
          >
            Reset
          </button>
        )}
        {totalSeconds > 0 && (
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            {Math.floor(totalSeconds / 60)}m{totalSeconds % 60 ? ` ${totalSeconds % 60}s` : ''} per question
          </p>
        )}
      </div>
    </div>
  );
}