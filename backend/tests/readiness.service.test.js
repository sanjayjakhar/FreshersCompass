import assert from 'node:assert/strict';
import {
  READINESS_AXES,
  computeOverallReadiness,
  getRoleBenchmark,
  sanitizeAxes,
  toTrendSeries,
  trimSnapshots,
  dayKey,
} from '../src/services/readiness.service.js';

let passed = 0;
const t = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
};

console.log('READINESS_AXES');
t('exposes 5 axes', () => {
  assert.deepEqual(READINESS_AXES, ['resume', 'code', 'interview', 'roadmap', 'velocity']);
});

console.log('\nsanitizeAxes');
t('keeps only the five known axes', () => {
  const out = sanitizeAxes({ resume: 80, evil: 1, __proto__: 1, code: 60 });
  assert.deepEqual(Object.keys(out).sort(), ['code', 'resume']);
});
t('drops non-finite values', () => {
  const out = sanitizeAxes({ resume: NaN, code: Infinity, interview: undefined, roadmap: 'x', velocity: null });
  assert.deepEqual(out, {});
});
t('does not coerce null, booleans or objects into a zero score', () => {
  // Number(null) and Number('') are both 0, which would fake an "unknown" axis.
  assert.deepEqual(sanitizeAxes({ resume: null, code: '', interview: true, roadmap: {}, velocity: [] }), {});
});
t('still accepts a real zero', () => {
  assert.equal(sanitizeAxes({ resume: 0 }).resume, 0);
});
t('coerces numeric strings', () => {
  assert.equal(sanitizeAxes({ resume: '82' }).resume, 82);
});
t('clamps out-of-range values', () => {
  assert.equal(sanitizeAxes({ resume: 140 }).resume, 100);
  assert.equal(sanitizeAxes({ code: -20 }).code, 0);
});
t('survives non-object input', () => {
  assert.deepEqual(sanitizeAxes(null), {});
  assert.deepEqual(sanitizeAxes('nope'), {});
  assert.deepEqual(sanitizeAxes(undefined), {});
});
t('rounds fractional values', () => {
  assert.equal(sanitizeAxes({ resume: 82.6 }).resume, 83);
});

console.log('\ncomputeOverallReadiness');
t('weights sum to 1 so a full profile is 100', () => {
  const full = { resume: 100, code: 100, interview: 100, roadmap: 100, velocity: 100 };
  assert.equal(computeOverallReadiness(full), 100);
});
t('an empty profile is 0', () => {
  assert.equal(computeOverallReadiness({}), 0);
});
t('matches the published weighting', () => {
  // resume 100*.25 + code 0*.25 + interview 100*.20 + roadmap 0*.15 + velocity 100*.15
  assert.equal(
    computeOverallReadiness({ resume: 100, code: 0, interview: 100, roadmap: 0, velocity: 100 }),
    60
  );
});
t('ignores extra keys', () => {
  assert.equal(
    computeOverallReadiness({ resume: 100, code: 100, interview: 100, roadmap: 100, velocity: 100, bogus: 0 }),
    100
  );
});

console.log('\ngetRoleBenchmark');
t('maps Junior Fullstack Engineer to the fullstack curve', () => {
  const b = getRoleBenchmark('Junior Fullstack Engineer');
  assert.equal(b.family, 'fullstack');
  assert.equal(b.matched, true);
  assert.equal(b.axes.resume, 74);
  assert.equal(b.familyLabel, 'Full-Stack Engineer');
});
t('maps backend with a seniority prefix', () => {
  assert.equal(getRoleBenchmark('Senior Backend Engineer (Payments)').family, 'backend');
});
t('maps DevOps & Cloud before systems', () => {
  assert.equal(getRoleBenchmark('DevOps & Cloud Engineer').family, 'devops');
});
t('maps AI/ML variants', () => {
  assert.equal(getRoleBenchmark('AI / ML & Data').family, 'aiml');
  assert.equal(getRoleBenchmark('Machine Learning Engineer').family, 'aiml');
});
t('maps frontend spellings', () => {
  assert.equal(getRoleBenchmark('Front End Developer').family, 'frontend');
  assert.equal(getRoleBenchmark('React Developer').family, 'frontend');
});
t('falls back to the general curve for unknown roles', () => {
  const b = getRoleBenchmark('Astronaut Trainee');
  assert.equal(b.family, 'general');
  assert.equal(b.matched, false);
  assert.equal(b.axes.resume, 71);
});
t('falls back for an empty role and still returns all 5 axes', () => {
  const b = getRoleBenchmark('');
  assert.equal(b.role, 'Unspecified role');
  assert.equal(b.matched, false);
  assert.deepEqual(Object.keys(b.axes).sort(), [...READINESS_AXES].sort());
});
t('tolerates a null role', () => {
  assert.equal(getRoleBenchmark(null).matched, false);
});
t('returns an independent axes object per call', () => {
  const a = getRoleBenchmark('Backend');
  a.axes.resume = 0;
  assert.equal(getRoleBenchmark('Backend').axes.resume, 72);
});

console.log('\ntrimSnapshots');
t('caps the array', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ day: `d${i}` }));
  assert.equal(trimSnapshots(many, 30).length, 30);
});
t('drops non-object entries', () => {
  assert.deepEqual(trimSnapshots([null, undefined, { day: 'a' }, 5, 'x']), [{ day: 'a' }]);
});
t('handles non-array input', () => {
  assert.deepEqual(trimSnapshots(null), []);
});

console.log('\ntoTrendSeries');
t('reverses newest-first storage into chronological order', () => {
  const series = toTrendSeries([
    { capturedAt: '2026-03-03T00:00:00Z', overall: 30, axes: { resume: 30 } },
    { capturedAt: '2026-03-02T00:00:00Z', overall: 20, axes: { resume: 20 } },
    { capturedAt: '2026-03-01T00:00:00Z', overall: 10, axes: { resume: 10 } },
  ]);
  assert.deepEqual(series.map((p) => p.overall), [10, 20, 30]);
});
t('accepts flat axis keys as well as a nested axes object', () => {
  const series = toTrendSeries([{ capturedAt: '2026-01-01', overall: 50, resume: 55, code: 45 }]);
  assert.equal(series[0].resume, 55);
  assert.equal(series[0].code, 45);
});
t('clamps a rogue overall value', () => {
  const series = toTrendSeries([{ capturedAt: '2026-01-01', overall: 900 }]);
  assert.equal(series[0].overall, 100);
});
t('returns an empty series for junk', () => {
  assert.deepEqual(toTrendSeries(undefined), []);
});

console.log('\ndayKey');
t('is a UTC day string', () => {
  assert.equal(dayKey('2026-03-04T23:59:59Z'), '2026-03-04');
});
t('two visits on the same UTC day collapse to one key', () => {
  assert.equal(dayKey('2026-03-04T00:00:01Z'), dayKey('2026-03-04T23:59:59Z'));
});

console.log(`\n${passed} assertions passed.`);