import { useMemo } from 'react';

/**
 * ReadinessTrendline — historical readiness progression over time (#58)
 *
 * Plots the stored daily snapshots as an SVG polyline. With a single snapshot
 * there is no line to draw, so the empty state explains when the first point
 * will appear rather than rendering a flat, misleading line.
 */

const WIDTH = 320;
const HEIGHT = 120;
const PADDING = { top: 10, right: 8, bottom: 18, left: 24 };

const AXIS_KEYS = ['resume', 'code', 'interview', 'roadmap', 'velocity'];

const AXIS_COLORS = {
  resume: '#185FA5',
  code: '#0F6E56',
  interview: '#D85A30',
  roadmap: '#8A6D1F',
  velocity: '#5F5E5A',
};

const formatDay = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function ReadinessTrendline({ history = [], className = '' }) {
  const points = useMemo(
    () =>
      (Array.isArray(history) ? history : [])
        .filter((p) => p && Number.isFinite(Number(p.overall)))
        .map((p) => ({
          capturedAt: p.capturedAt,
          overall: Math.min(100, Math.max(0, Number(p.overall))),
          axes: p,
        })),
    [history]
  );

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const coords = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) return [{ x: PADDING.left, y: PADDING.top + plotH * (1 - points[0].overall / 100) }];
    return points.map((point, index) => ({
      x: PADDING.left + (plotW * index) / (points.length - 1),
      y: PADDING.top + plotH * (1 - point.overall / 100),
    }));
  }, [points, plotW, plotH]);

  const linePath = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `${PADDING.left},${PADDING.top + plotH} ${linePath} ${coords[coords.length - 1].x.toFixed(1)},${PADDING.top + plotH}`
      : '';

  const latest = points.length ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = latest && previous ? latest.overall - previous.overall : null;

  const firstLabel = formatDay(points[0]?.capturedAt);
  const lastLabel = formatDay(points[points.length - 1]?.capturedAt);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Historical progression
          </span>
          <p className="text-[11px] text-text-body mt-0.5">
            {points.length === 0
              ? 'No snapshots recorded yet.'
              : `${points.length} daily snapshot${points.length === 1 ? '' : 's'} recorded.`}
          </p>
        </div>
        {delta !== null && (
          <span
            className={`text-xs font-mono font-bold shrink-0 ${
              delta >= 0 ? 'text-success' : 'text-accent'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta} since last
          </span>
        )}
      </div>

      {points.length === 0 ? (
        <div className="h-28 rounded-xl border border-dashed border-border bg-surface flex items-center justify-center px-4 text-center">
          <p className="text-[11px] text-text-muted leading-relaxed">
            Your readiness trendline appears here once a snapshot is captured. Visiting the cockpit daily
            records one point per day.
          </p>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-28"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Readiness trendline with ${points.length} snapshots, latest ${latest.overall} out of 100.`}
          >
            {/* Horizontal guides at 25 / 50 / 75 / 100 */}
            {[25, 50, 75, 100].map((value) => {
              const y = PADDING.top + plotH * (1 - value / 100);
              return (
                <g key={value}>
                  <line
                    x1={PADDING.left}
                    y1={y}
                    x2={WIDTH - PADDING.right}
                    y2={y}
                    stroke="#E5E4DF"
                    strokeWidth="1"
                  />
                  <text x={PADDING.left - 4} y={y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 7, fontWeight: 700 }} className="fill-current text-text-muted">
                    {value}
                  </text>
                </g>
              );
            })}

            {areaPath && <polygon points={areaPath} fill="rgba(24,95,165,0.10)" />}

            {coords.length > 1 && (
              <polyline
                points={linePath}
                fill="none"
                stroke="#185FA5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-700 ease-out"
              />
            )}

            {coords.map((c, index) => (
              <circle
                key={index}
                cx={c.x}
                cy={c.y}
                r={index === coords.length - 1 ? 3.5 : 2}
                fill="#185FA5"
              />
            ))}

            {firstLabel && (
              <text x={PADDING.left} y={HEIGHT - 5} style={{ fontSize: 7, fontWeight: 700 }} className="fill-current text-text-muted">
                {firstLabel}
              </text>
            )}
            {lastLabel && points.length > 1 && (
              <text
                x={WIDTH - PADDING.right}
                y={HEIGHT - 5}
                textAnchor="end"
                style={{ fontSize: 7, fontWeight: 700 }}
                className="fill-current text-text-muted"
              >
                {lastLabel}
              </text>
            )}
          </svg>

          {points.length > 1 && (
            <ul className="mt-2 space-y-1">
              {AXIS_KEYS.map((key) => {
                const from = Math.min(100, Math.max(0, Number(previous[key]) || 0));
                const to = Math.min(100, Math.max(0, Number(latest[key]) || 0));
                const change = to - from;
                return (
                  <li key={key} className="flex items-center justify-between text-[10px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-text-body capitalize">
                      <span
                        className="w-2 h-2 rounded-sm inline-block"
                        style={{ backgroundColor: AXIS_COLORS[key] }}
                      />
                      {key}
                    </span>
                    <span className="font-mono font-bold text-text-muted">
                      {from} → {to}
                      <span className={change >= 0 ? ' text-success' : ' text-accent'}>
                        {' '}
                        ({change >= 0 ? '+' : ''}
                        {change})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}