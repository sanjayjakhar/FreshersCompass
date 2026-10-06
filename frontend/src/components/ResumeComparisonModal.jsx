import { useState, useEffect } from 'react';
import {
  X, GitCompare, ArrowRight, TrendingUp, TrendingDown,
  CheckCircle2, PlusCircle, MinusCircle, Sparkles, FileText, Check
} from 'lucide-react';
import { fetchResumeById } from '../services/api';

export default function ResumeComparisonModal({
  isOpen,
  onClose,
  versions = [],
  currentVersionId,
}) {
  const [versionAId, setVersionAId] = useState('');
  const [versionBId, setVersionBId] = useState('');
  const [versionAData, setVersionAData] = useState(null);
  const [versionBData, setVersionBData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize version selectors when modal opens
  useEffect(() => {
    if (!isOpen || versions.length < 2) return;

    // Pick current version as B, and the version right before it as A
    const currentIdx = versions.findIndex((v) => v._id === currentVersionId);
    const bId = currentVersionId || versions[versions.length - 1]?._id;
    const aId =
      currentIdx > 0
        ? versions[currentIdx - 1]?._id
        : versions[0]?._id !== bId
        ? versions[0]?._id
        : versions[1]?._id;

    setVersionAId(aId);
    setVersionBId(bId);
  }, [isOpen, versions, currentVersionId]);

  // Load detailed resume documents when version IDs change
  useEffect(() => {
    if (!isOpen || !versionAId || !versionBId) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [resA, resB] = await Promise.all([
          fetchResumeById(versionAId),
          fetchResumeById(versionBId),
        ]);
        if (isMounted) {
          setVersionAData(resA);
          setVersionBData(resB);
        }
      } catch (err) {
        console.error('Failed to load version comparison data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, versionAId, versionBId]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scoreA = versionAData?.ats_score ?? 0;
  const scoreB = versionBData?.ats_score ?? 0;
  const scoreDelta = scoreB - scoreA;
  const percentageDelta = scoreA > 0 ? Math.round((scoreDelta / scoreA) * 100) : 0;

  const skillsA = new Set((versionAData?.skills || []).map((s) => s.trim().toLowerCase()));
  const skillsB = new Set((versionBData?.skills || []).map((s) => s.trim().toLowerCase()));

  // Skills diff
  const addedSkills = (versionBData?.skills || []).filter(
    (s) => !skillsA.has(s.trim().toLowerCase())
  );
  const droppedSkills = (versionAData?.skills || []).filter(
    (s) => !skillsB.has(s.trim().toLowerCase())
  );
  const retainedSkills = (versionBData?.skills || []).filter((s) =>
    skillsA.has(s.trim().toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <h2 id="comparison-dialog-title" className="text-base font-bold text-text-dark">
                Side-by-Side ATS Version Comparison
              </h2>
              <p className="text-xs text-text-body">
                Analyze score improvement, keyword additions, and feedback differences between iterations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison dialog"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-dark hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Version Selectors Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-border">
            {/* Version A (Baseline) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Baseline Version (A)
              </label>
              <select
                value={versionAId}
                onChange={(e) => setVersionAId(e.target.value)}
                className="w-full p-2.5 bg-white rounded-lg border border-border text-xs font-semibold text-text-dark focus:outline-none focus:border-primary"
              >
                {versions.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.versionLabel || `Version ${v.versionNumber}`} ({v.ats_score} pts) • {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Version B (Target) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Target / Revised Version (B)
              </label>
              <select
                value={versionBId}
                onChange={(e) => setVersionBId(e.target.value)}
                className="w-full p-2.5 bg-white rounded-lg border border-border text-xs font-semibold text-text-dark focus:outline-none focus:border-primary"
              >
                {versions.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.versionLabel || `Version ${v.versionNumber}`} ({v.ats_score} pts) • {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delta Banner */}
          <div className="p-5 rounded-xl border bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  scoreDelta >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                }`}
              >
                {scoreDelta >= 0 ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
              </div>
              <div>
                <span className="text-xs text-slate-300 font-medium">ATS Readiness Delta</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-2xl font-black ${scoreDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                    {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} points
                  </span>
                  <span className="text-xs text-slate-400">
                    ({percentageDelta >= 0 ? `+${percentageDelta}%` : `${percentageDelta}%`})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-300 border-t sm:border-t-0 sm:border-l border-slate-700 pt-3 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-slate-400 block text-[11px]">Version A Score</span>
                <span className="text-lg font-bold text-white">{scoreA}/100</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-slate-400 block text-[11px]">Version B Score</span>
                <span className="text-lg font-bold text-success">{scoreB}/100</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Version A Card */}
            <div className="p-5 rounded-xl border border-border bg-slate-50/60 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text-dark">
                    {versionAData?.versionLabel || 'Version A'}
                  </h3>
                  <span className="text-[11px] text-text-muted">
                    {versionAData?.fileName || 'Document'}
                  </span>
                </div>
                <span className="text-base font-black text-primary">
                  {scoreA} <span className="text-xs font-normal text-text-muted">/100</span>
                </span>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-dark">Identified Flaws ({versionAData?.improvement_suggestions?.length || 0})</span>
                <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside">
                  {(versionAData?.improvement_suggestions || []).slice(0, 3).map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Version B Card */}
            <div className="p-5 rounded-xl border border-border bg-white shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text-dark">
                    {versionBData?.versionLabel || 'Version B'}
                  </h3>
                  <span className="text-[11px] text-text-muted">
                    {versionBData?.fileName || 'Document'}
                  </span>
                </div>
                <span className="text-base font-black text-success">
                  {scoreB} <span className="text-xs font-normal text-text-muted">/100</span>
                </span>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-dark">Optimizations Remaining ({versionBData?.improvement_suggestions?.length || 0})</span>
                <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside">
                  {(versionBData?.improvement_suggestions || []).slice(0, 3).map((item, idx) => (
                    <li key={idx} className="leading-snug">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Skills Delta Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Skill & Keyword Differential</span>
            </h3>

            {/* Added Skills */}
            {addedSkills.length > 0 && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  <span>Newly Added Skills in Version B (+{addedSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {addedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold shadow-2xs"
                    >
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dropped Skills */}
            {droppedSkills.length > 0 && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <MinusCircle className="h-4 w-4 text-amber-600" />
                  <span>Skills Dropped / Omitted in Version B (-{droppedSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {droppedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold shadow-2xs"
                    >
                      - {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Retained Common Skills */}
            {retainedSkills.length > 0 && (
              <div className="p-4 bg-slate-50 border border-border rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Common Skills Across Both Iterations ({retainedSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {retainedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 bg-white border border-border text-text-dark rounded-md text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="btn-ghost px-5 py-2 text-xs font-bold"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
