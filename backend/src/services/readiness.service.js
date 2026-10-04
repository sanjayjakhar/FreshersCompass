/**
 * Career readiness benchmark + snapshot helpers (#58)
 *
 * The radar chart needs two things the profile document does not carry:
 *   1. a market-average reference polygon for the candidate's target role
 *   2. an append-only history of readiness snapshots for the trendline
 *
 * Both are served from here so the Dashboard and the Career Twin render the
 * exact same numbers.
 */

/** Canonical readiness axes, in radar draw order. */
export const READINESS_AXES = ['resume', 'code', 'interview', 'roadmap', 'velocity'];

export const READINESS_AXIS_LABELS = {
  resume: 'Resume & ATS Precision',
  code: 'Codebase Architecture Depth',
  interview: 'Interview Articulation',
  roadmap: 'Roadmap Milestone Coverage',
  velocity: 'Pipeline Velocity',
};

export const READINESS_AXIS_WEIGHTS = {
  resume: 0.25,
  code: 0.25,
  interview: 0.2,
  roadmap: 0.15,
  velocity: 0.15,
};

/**
 * Reference market averages per role family. These are static published-style
 * reference points, not live survey data, and are surfaced in the UI as
 * "reference benchmark" so candidates do not read them as a guarantee.
 */
const ROLE_BENCHMARKS = {
  frontend: { resume: 72, code: 70, interview: 68, roadmap: 65, velocity: 74 },
  backend: { resume: 72, code: 76, interview: 70, roadmap: 66, velocity: 73 },
  fullstack: { resume: 74, code: 73, interview: 70, roadmap: 67, velocity: 75 },
  aiml: { resume: 70, code: 74, interview: 66, roadmap: 64, velocity: 72 },
  devops: { resume: 68, code: 77, interview: 69, roadmap: 65, velocity: 73 },
  systems: { resume: 70, code: 78, interview: 72, roadmap: 64, velocity: 71 },
  qa: { resume: 68, code: 66, interview: 70, roadmap: 64, velocity: 72 },
  data: { resume: 70, code: 70, interview: 68, roadmap: 66, velocity: 73 },
};

/** Used when the target role does not map to a known family. */
const GENERIC_BENCHMARK = { resume: 71, code: 71, interview: 69, roadmap: 65, velocity: 73 };

/**
 * Map a free-text target role onto a benchmark family. Longest keyword wins so
 * "Senior Backend Engineer (Payments)" resolves to the backend curve.
 */
const ROLE_KEYWORDS = [
  { family: 'fullstack', keywords: ['full stack', 'fullstack', 'full-stack', 'mern', 'mean stack'] },
  { family: 'frontend', keywords: ['front end', 'frontend', 'front-end', 'ui engineer', 'react'] },
  { family: 'backend', keywords: ['back end', 'backend', 'back-end', 'api engineer', 'node'] },
  { family: 'devops', keywords: ['devops', 'sre', 'cloud', 'platform engineer', 'infrastructure'] },
  { family: 'aiml', keywords: ['ai ', 'ml', 'machine learning', 'data science', 'deep learning', 'llm', 'nlp', 'aiml'] },
  { family: 'systems', keywords: ['systems', 'core java', 'distributed', 'compiler', 'kernel'] },
  { family: 'qa', keywords: ['qa', 'quality assurance', 'test', 'sdet'] },
  { family: 'data', keywords: ['data engineer', 'data analyst', 'analytics', 'etl'] },
];

const familyLabel = {
  frontend: 'Frontend Engineer',
  backend: 'Backend Engineer',
  fullstack: 'Full-Stack Engineer',
  aiml: 'AI / ML Engineer',
  devops: 'DevOps & Cloud Engineer',
  systems: 'Core Systems Engineer',
  qa: 'QA / SDET Engineer',
  data: 'Data Engineer',
};

const clampScore = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
};

/**
 * Resolve the benchmark polygon for a target role.
 * @returns {{ role: string, family: string, familyLabel: string, matched: boolean, axes: Record<string, number> }}
 */
export const getRoleBenchmark = (targetRole = '') => {
  const role = String(targetRole || '').trim();
  const haystack = ` ${role.toLowerCase()}`;

  let family = null;
  if (role) {
    for (const entry of ROLE_KEYWORDS) {
      if (entry.keywords.some((kw) => haystack.includes(kw))) {
        family = entry.family;
        break;
      }
    }
  }

  const axes = family ? ROLE_BENCHMARKS[family] : GENERIC_BENCHMARK;

  return {
    role: role || 'Unspecified role',
    family: family || 'general',
    familyLabel: family ? familyLabel[family] : 'General Engineering',
    matched: Boolean(family),
    axes: { ...axes },
  };
};

/**
 * Weighted overall readiness from a set of axis scores.
 */
export const computeOverallReadiness = (axes = {}) => {
  let total = 0;
  READINESS_AXES.forEach((axis) => {
    total += clampScore(axes[axis]) * READINESS_AXIS_WEIGHTS[axis];
  });
  return Math.round(total);
};

/**
 * Normalise an incoming axis payload, dropping unknown keys and clamping values.
 *
 * `null`, `''`, booleans and objects are rejected rather than coerced:
 * `Number(null)` is 0 and `Number('')` is 0, which would silently record "unknown"
 * as a genuine zero and drag the radar down.
 */
export const sanitizeAxes = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const axes = {};
  READINESS_AXES.forEach((axis) => {
    const raw = source[axis];
    if (raw === null || raw === undefined || typeof raw === 'boolean' || raw === '') return;
    if (typeof raw === 'object') return;
    const num = Number(raw);
    if (Number.isFinite(num)) {
      axes[axis] = clampScore(num);
    }
  });
  return axes;
};

/** UTC day key, used to keep the trendline at one point per day. */
export const dayKey = (date = new Date()) => new Date(date).toISOString().slice(0, 10);

/**
 * Keep at most `limit` snapshots, newest first.
 */
export const trimSnapshots = (snapshots = [], limit = 30) =>
  (Array.isArray(snapshots) ? snapshots : [])
    .filter((s) => s && typeof s === 'object')
    .slice(0, limit);

/**
 * Render stored snapshots as a chronological trendline series.
 */
export const toTrendSeries = (snapshots = []) =>
  trimSnapshots(snapshots)
    .map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      overall: clampScore(snapshot.overall),
      ...sanitizeAxes(snapshot.axes || snapshot),
    }))
    .reverse();