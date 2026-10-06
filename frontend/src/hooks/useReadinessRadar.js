import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchLatestResume,
  fetchProfileFromDB,
  fetchApplicationsFromDB,
  fetchReadinessTelemetry,
  recordReadinessSnapshot,
} from '../services/api';

/**
 * useReadinessRadar — shared 5-axis readiness model (#58)
 *
 * Dashboard and Career Twin both render the same radar, so the axis maths and
 * the snapshot/telemetry lifecycle live here instead of being duplicated.
 *
 * Axes:
 *   resume    — ATS score from the uploaded resume
 *   code      — GitHub codebase health (only counts once a handle is connected)
 *   interview — latest mock interview score
 *   roadmap   — skill-gap roadmap milestone coverage
 *   velocity  — application pipeline velocity
 */

const AXIS_WEIGHTS = { resume: 0.25, code: 0.25, interview: 0.2, roadmap: 0.15, velocity: 0.15 };

export const READINESS_ROUTES = {
  resume: '/resume',
  code: '/codebase',
  interview: '/interview',
  roadmap: '/roadmap',
  velocity: '/applications',
};

const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * Pipeline velocity from the tracker: a fuller board with movement further along
 * scores higher than an empty or stalled board.
 */
const computeVelocity = (apps = [], fallback = 0) => {
  if (!Array.isArray(apps) || apps.length === 0) return fallback;

  const stageWeight = {
    applied: 10,
    screening: 25,
    interview: 55,
    offer: 80,
    rejected: 5,
  };

  const scored = apps.map((app) => {
    const status = String(app?.status || 'applied').toLowerCase();
    const base = stageWeight[status] ?? 10;
    const matchBonus = clamp(app?.matchScore) * 0.2;
    return clamp(base + matchBonus);
  });

  const average = scored.reduce((sum, v) => sum + v, 0) / scored.length;
  // Breadth bonus: a board with more tracked applications shows more momentum.
  const breadth = Math.min(20, apps.length * 4);
  return Math.round(clamp(average * 0.85 + breadth));
};

export default function useReadinessRadar() {
  const navigate = useNavigate();

  const [resumeData, setResumeData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [githubUser, setGithubUser] = useState('');
  const [history, setHistory] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [telemetryError, setTelemetryError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [resume, profile, apps] = await Promise.all([
        fetchLatestResume(),
        fetchProfileFromDB(),
        fetchApplicationsFromDB(),
      ]);

      if (resume) setResumeData(resume);
      if (profile) {
        setProfileData(profile);
        setGithubUser(profile.github_username || '');
        setTargetRole(profile.target_role || '');
      }
      if (Array.isArray(apps)) setApplications(apps);
    } catch (e) {
      console.error('Failed to load readiness inputs:', e);
    }

    try {
      const telemetry = await fetchReadinessTelemetry();
      setHistory(telemetry?.history || []);
      setBenchmark(telemetry?.benchmark || null);
      if (telemetry?.target_role) setTargetRole(telemetry.target_role);
    } catch (e) {
      console.error('Failed to load readiness telemetry:', e);
      setTelemetryError('Historical readiness telemetry is unavailable right now.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const axes = useMemo(() => {
    const resume = clamp(resumeData?.ats_score);
    const code = githubUser ? clamp(profileData?.competency_scores?.code || 80) : 0;
    const interview = clamp(profileData?.competency_scores?.interview);
    const roadmapFallback = resumeData ? 60 : 0;
    const roadmap = profileData?.competency_scores?.roadmap !== undefined
      ? clamp(profileData.competency_scores.roadmap)
      : roadmapFallback;
    const velocityFallback = resumeData ? 75 : 0;
    const velocity = profileData?.competency_scores?.velocity !== undefined && profileData?.competency_scores?.velocity !== null
      ? clamp(profileData.competency_scores.velocity)
      : computeVelocity(applications, velocityFallback);

    return { resume, code, interview, roadmap, velocity };
  }, [resumeData, profileData, applications, githubUser]);

  const overallReadiness = useMemo(() => {
    const total = Object.keys(AXIS_WEIGHTS).reduce(
      (sum, key) => sum + axes[key] * AXIS_WEIGHTS[key],
      0
    );
    return Math.round(total);
  }, [axes]);

  const hasSignal = Object.values(axes).some((v) => v > 0);

  /**
   * Record today's reading. Backend keeps one snapshot per UTC day, so calling
   * this on every visit is cheap and simply refreshes the current point.
   */
  const recordSnapshot = useCallback(async () => {
    if (!hasSignal) return null;
    try {
      const data = await recordReadinessSnapshot(axes, overallReadiness);
      if (data?.history) setHistory(data.history);
      if (data?.benchmark) setBenchmark(data.benchmark);
      return data;
    } catch (e) {
      console.error('Failed to record readiness snapshot:', e);
      return null;
    }
  }, [axes, overallReadiness, hasSignal]);

  // Capture a snapshot once per mount, after inputs have settled.
  useEffect(() => {
    if (!hasSignal) return;
    const timer = setTimeout(() => {
      recordSnapshot();
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasSignal, recordSnapshot]);

  const goToAxis = useCallback(
    (route) => {
      if (route) navigate(route);
    },
    [navigate]
  );

  return {
    resumeData,
    profileData,
    applications,
    githubUser,
    axes,
    overallReadiness,
    hasSignal,
    history,
    benchmark,
    targetRole,
    telemetryError,
    reload: load,
    recordSnapshot,
    goToAxis,
    routes: READINESS_ROUTES,
  };
}