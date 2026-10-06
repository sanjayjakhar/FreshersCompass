import { useMemo } from 'react';

/**
 * ReadinessRadar — 5-axis SVG spider chart with market benchmark overlay (#58)
 *
 * A single 1D readiness number hides dimensional blindspots (high code health,
 * weak interview articulation), so the axes are drawn as a polygon instead of
 * a flat bar list. The dashed polygon is the reference market average for the
 * candidate's target role, which turns the chart into a gap analysis rather
 * than just a score display.
 */

const AXIS_KEYS = ['resume', 'code', 'interview', 'roadmap', 'velocity'];

const AXIS_META = {
  resume: { label: 'Resume & ATS', full: 'Resume & ATS Keyword Precision', short: 'Resume' },
  code: { label: 'Codebase Depth', full: 'GitHub Codebase Architecture Depth', short: 'Code' },
  interview: { label: 'Interview', full: 'Technical Interview Articulation', short: 'Interview' },
  roadmap: { label: 'Roadmap', full: 'Skill-Gap Roadmap Milestone Coverage', short: 'Roadmap' },
  velocity: { label: 'Pipeline', full: 'Application Tracker Pipeline Velocity', short: 'Pipeline' },
};

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 88;
const RING_STEPS = [20, 40, 60, 80, 100];

/** Radar axes start at 12 o'clock and sweep clockwise. */
const angleFor = (index) => (Math.PI * 2 * index) / AXIS_KEYS.length - Math.PI / 2;

const toPoint = (index, value) => {
  const ratio = Math.min(100, Math.max(0, Number(value) || 0)) / 100;
  const angle = angleFor(index);
  return {
    x: CENTER + RADIUS * ratio * Math.cos(angle),
    y: CENTER + RADIUS * ratio * Math.sin(angle),
  };
};

const polygonPoints = (values) =>
  AXIS_KEYS.map((key, index) => {
    const { x, y } = toPoint(index, values?.[key]);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));

export default function ReadinessRadar({
  axes = {},
  benchmark = null,
  onAxisClick = null,
  routes = {},
  className = '',
}) {
  const values = useMemo(() => {
    const next = {};
    AXIS_KEYS.forEach((key) => {
      next[key] = clamp(axes?.[key]);
    });
    return next;
  }, [axes]);

  const hasSignal = AXIS_KEYS.some((key) => values[key] > 0);
  const showBenchmark = Boolean(benchmark?.axes);

  const benchmarkValues = useMemo(() => {
    const next = {};
    AXIS_KEYS.forEach((key) => {
      next[key] = clamp(benchmark?.axes?.[key]);
    });
    return next;
  }, [benchmark]);

  const overall = useMemo(() => {
    const weights = { resume: 0.25, code: 0.25, interview: 0.2, roadmap: 0.15, velocity: 0.15 };
    const total = AXIS_KEYS.reduce((sum, key) => sum + values[key] * weights[key], 0);
    return Math.round(total);
  }, [values]);

  const strongest = useMemo(() => {
    let best = null;
    AXIS_KEYS.forEach((key) => {
      if (!best || values[key] > values[best]) best = key;
    });
    return best;
  }, [values]);

  const weakest = useMemo(() => {
    let worst = null;
    AXIS_KEYS.forEach((key) => {
      if (!worst || values[key] < values[worst]) worst = key;
    });
    return worst;
  }, [values]);

  const axesSummary = AXIS_KEYS.map((key) => ({
    key,
    label: AXIS_META[key].label,
    full: AXIS_META[key].full,
    score: values[key],
    delta: showBenchmark ? values[key] - benchmarkValues[key] : 0,
    route: routes?.[key],
  }));

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-6 items-center ${className}`}>
      {/* ---------- Radar ---------- */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full h-full"
            role="img"
            aria-label={`Career readiness radar across ${AXIS_KEYS.length} axes. Overall ${overall} out of 100.${
              showBenchmark ? ` Reference benchmark: ${benchmark.familyLabel}.` : ''
            }`}
          >
            {/* Concentric grid rings */}
            {RING_STEPS.map((step) => (
              <polygon
                key={step}
                points={polygonPoints(
                  AXIS_KEYS.reduce((acc, key) => ({ ...acc, [key]: step }), {})
                )}
                fill="none"
                stroke="#E5E4DF"
                strokeWidth="1"
              />
            ))}

            {/* Axis spokes */}
            {AXIS_KEYS.map((key, index) => {
              const { x, y } = toPoint(index, 100);
              return (
                <line
                  key={key}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="#E5E4DF"
                  strokeWidth="1"
                />
              );
            })}

            {/* Reference market benchmark (dashed, underneath) */}
            {showBenchmark && (
              <polygon
                points={polygonPoints(benchmarkValues)}
                fill="none"
                stroke="#5F5E5A"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinejoin="round"
              />
            )}

            {/* Candidate polygon */}
            <polygon
              points={polygonPoints(values)}
              fill="rgba(24,95,165,0.18)"
              stroke="#185FA5"
              strokeWidth="2"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Candidate vertices */}
            {AXIS_KEYS.map((key, index) => {
              const { x, y } = toPoint(index, values[key]);
              return <circle key={key} cx={x} cy={y} r="3" fill="#185FA5" />;
            })}

            {/* Axis labels around the outside */}
            {AXIS_KEYS.map((key, index) => {
              const angle = angleFor(index);
              const lx = CENTER + (RADIUS + 22) * Math.cos(angle);
              const ly = CENTER + (RADIUS + 20) * Math.sin(angle);
              const meta = AXIS_META[key];
              const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
              return (
                <text
                  key={key}
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-current text-text-muted"
                  style={{ fontSize: 9, fontWeight: 700 }}
                >
                  {meta.short}
                  <tspan x={lx} dy="11" style={{ fontSize: 9, fontWeight: 800 }}>
                    {values[key]}
                  </tspan>
                </text>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1 text-[10px] font-semibold text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-primary inline-block" />
            You
          </span>
          {showBenchmark && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-0 rounded inline-block"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to right, #5F5E5A 0, #5F5E5A 3px, transparent 3px, transparent 6px)',
                }}
              />
              {benchmark.familyLabel} avg
            </span>
          )}
        </div>
      </div>

      {/* ---------- Axis breakdown ---------- */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Multi-axis readiness
            </span>
            <p className="text-xs text-text-body mt-0.5 max-w-md">
              {hasSignal
                ? `Strongest on ${AXIS_META[strongest].full.toLowerCase()}, weakest on ${AXIS_META[weakest].full.toLowerCase()}.`
                : 'Add a resume, GitHub profile and mock interview to populate these axes.'}
            </p>
          </div>
          <span className="text-3xl font-black text-text-dark shrink-0">{overall}</span>
        </div>

        <ul className="space-y-2">
          {axesSummary.map((axis) => {
            const aboveBenchmark = showBenchmark && axis.delta >= 0;
            const Row = axis.route && onAxisClick ? 'button' : 'div';
            return (
              <li key={axis.key}>
                <Row
                  {...(axis.route && onAxisClick
                    ? { type: 'button', onClick: () => onAxisClick(axis.route) }
                    : {})}
                  className={`w-full text-left p-2.5 rounded-xl border border-border bg-surface transition-all ${
                    axis.route && onAxisClick ? 'hover:border-primary/40 hover:bg-white cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-text-dark truncate">{axis.full}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {showBenchmark && (
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            aboveBenchmark ? 'text-success' : 'text-warning'
                          }`}
                        >
                          {axis.delta >= 0 ? '+' : ''}
                          {axis.delta}
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-text-dark w-8 text-right">
                        {axis.score}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-2 w-full bg-white rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${axis.score}%` }}
                    />
                    {showBenchmark && (
                      <span
                        className="absolute top-0 bottom-0 w-0.5 bg-secondary"
                        style={{ left: `${axis.delta >= 0 ? 100 - (axis.delta / 100) * 100 : 100}%` }}
                        title={`Reference benchmark ${benchmarkValues[axis.key]}`}
                      />
                    )}
                  </div>
                </Row>
              </li>
            );
          })}
        </ul>

        {showBenchmark && (
          <p className="text-[10px] text-text-muted leading-relaxed">
            Benchmark reference for <span className="font-bold text-text-body">{benchmark.role}</span>{' '}
            mapped to the {benchmark.familyLabel} market curve
            {benchmark.matched ? '' : ' (closest general curve — set an explicit target role for a tighter match)'}.
            Static reference points, not live survey data.
          </p>
        )}
      </div>
    </div>
  );
}

export { AXIS_KEYS as READINESS_RADAR_AXES };