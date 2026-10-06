import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  Loader2, Zap, X, ChevronRight, Briefcase, GraduationCap,
  ExternalLink, Github, Linkedin, Sparkles, RefreshCw, Info, ArrowRight,
  Sliders, Download, Share2,
  GitCompare, Tag, Layers, History
} from 'lucide-react';

import {
  fetchLatestResume,
  fetchAllResumeVersions,
  fetchResumeById,
  uploadResumeToDB,
  seedDemoResumeToDB,
  deleteResumeFromDB,
} from '../services/api';

import ResumeSectionEditor from '../components/ResumeSectionEditor';
import ResumeShareBadgeModal from '../components/ResumeShareBadgeModal';
import ResumeComparisonModal from '../components/ResumeComparisonModal';
import ResumeScoreEvolutionChart from '../components/ResumeScoreEvolutionChart';

export default function ResumeATS() {
  const [activeTab, setActiveTab] = useState('resume'); // 'resume' | 'editor' | 'linkedin'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [versionLabelInput, setVersionLabelInput] = useState('');
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadPDF = () => {
    window.print();
  };

  // LinkedIn Optimization State
  const [linkedinText, setLinkedinText] = useState('');
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinResult, setLinkedinResult] = useState(null);

  // Load candidate resume directly from MongoDB on mount
  const loadResumeAndVersions = useCallback(async () => {
    try {
      const [latest, allVersions] = await Promise.all([
        fetchLatestResume(),
        fetchAllResumeVersions(),
      ]);
      if (allVersions && allVersions.length > 0) {
        setVersions(allVersions);
      }
      if (latest) {
        setParsedData(latest);
        setSelectedVersionId(latest._id);
      }
    } catch (e) {
      console.error('Failed to load resume or versions from MongoDB', e);
    }
  }, []);

  useEffect(() => {
    loadResumeAndVersions();
  }, [loadResumeAndVersions]);

  const handleSelectVersion = async (versionId) => {
    if (!versionId || versionId === selectedVersionId) return;
    setLoading(true);
    try {
      const doc = await fetchResumeById(versionId);
      if (doc) {
        setParsedData(doc);
        setSelectedVersionId(doc._id);
      }
    } catch (err) {
      console.error('Error switching resume version', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx'].includes(ext)) {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Only PDF and DOCX files are supported.');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const clearFile = async () => {
    setFile(null);
    setParsedData(null);
    setVersions([]);
    setSelectedVersionId('');
    setError('');
    setSuccessMsg('');
    try {
      await deleteResumeFromDB();
      window.dispatchEvent(
        new CustomEvent('freshercompass_profile_updated', {
          detail: '',
        })
      );
    } catch (e) {
      console.error('Failed to clear resume from MongoDB', e);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const savedDoc = await uploadResumeToDB(file, versionLabelInput);
      if (savedDoc) {
        setParsedData(savedDoc);
        setSelectedVersionId(savedDoc._id);
        setVersionLabelInput('');
        setSuccessMsg(`Resume "${file.name}" uploaded as "${savedDoc.versionLabel || 'New Version'}"!`);
        await loadResumeAndVersions();
        if (savedDoc.github_username) {
          window.dispatchEvent(
            new CustomEvent('freshercompass_profile_updated', {
              detail: savedDoc.github_username,
            })
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.details ||
        err.response?.data?.message ||
        err.message ||
        'Error processing resume. Check server connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const demoData = await seedDemoResumeToDB();
      if (demoData) {
        await loadResumeAndVersions();
        setSuccessMsg('Loaded multiple demo resume iterations for side-by-side comparison!');
        if (demoData.github_username) {
          window.dispatchEvent(
            new CustomEvent('freshercompass_profile_updated', {
              detail: demoData.github_username,
            })
          );
        }
      }
    } catch (err) {
      console.error('Error seeding demo resume to MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeLinkedin = () => {
    if (!linkedinText.trim()) return;
    setLinkedinLoading(true);
    setTimeout(() => {
      setLinkedinResult({
        headlineScore: 88,
        summaryScore: 74,
        keyStrengths: [
          'Strong action verbs highlighted in summary',
          'Clean presentation of technical toolchain',
        ],
        improvements: [
          'Add quantifiable outcomes to your current role (e.g. reduced load times by 30%)',
          'Include keywords: Docker, Fastify, Microservices for recruiter indexing',
        ],
      });
      setLinkedinLoading(false);
    }, 900);
  };

  // Split suggestions into semantic categories (Critical, Warning, Minor)
  const rawSuggestions = parsedData?.improvement_suggestions || [];
  const categorized = {
    critical: rawSuggestions.slice(0, 1),
    warning: rawSuggestions.slice(1, 3),
    minor: rawSuggestions.slice(3),
  };

  const atsScore = parsedData?.ats_score || 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Resume & ATS Intelligence
          </h1>
          <p className="text-text-body text-sm mt-1">
            Deterministic ATS parser, severity-grouped suggestions, interactive section editor, and ATS PDF export.
          </p>
        </div>

        {/* Actions, Version Selector & Tab Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap self-start">
          {versions.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-border shadow-2xs">
              <History className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex items-center gap-1.5">
                <label htmlFor="resume-version-select" className="text-[11px] font-semibold text-text-muted">
                  Version:
                </label>
                <select
                  id="resume-version-select"
                  value={selectedVersionId}
                  onChange={(e) => handleSelectVersion(e.target.value)}
                  className="bg-transparent text-xs font-bold text-text-dark focus:outline-none cursor-pointer max-w-[210px] truncate"
                >
                  {versions.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.versionLabel || `Version ${v.versionNumber}`} ({v.ats_score} pts)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {versions.length >= 2 && (
            <button
              id="compare-versions-btn"
              type="button"
              onClick={() => setIsComparisonModalOpen(true)}
              className="btn-accent px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Compare Versions</span>
            </button>
          )}

          {parsedData && (
            <>
              <button
                id="share-score-badge-btn"
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-bold text-primary hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>Share Score Badge</span>
              </button>
              <button
                id="download-ats-ready-pdf-btn"
                type="button"
                onClick={handleDownloadPDF}
                className="btn-accent px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download ATS-Ready PDF</span>
              </button>
            </>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'resume'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-text-body hover:text-text-dark'
              }`}
            >
              Resume ATS Analysis
            </button>
            <button
              id="tab-interactive-ats"
              onClick={() => setActiveTab('editor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-text-body hover:text-text-dark'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Interactive ATS Template & PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('linkedin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'linkedin'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-text-body hover:text-text-dark'
              }`}
            >
              LinkedIn Review
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">ATS Compliance Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-3xl font-black ${
                atsScore >= 75 ? 'text-success' : atsScore >= 50 ? 'text-warning' : 'text-danger'
              }`}
            >
              {parsedData ? atsScore : '--'}
            </span>
            <span className="text-xs text-text-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {atsScore >= 75 ? 'High probability of passing recruiter filters' : 'Requires key improvements'}
          </p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Extracted Skills</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-primary">
              {parsedData?.skills?.length || 0}
            </span>
            <span className="text-xs text-text-muted">verified keywords</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Parsed from technical experience</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Identified Flaws</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-warning">
              {rawSuggestions.length}
            </span>
            <span className="text-xs text-text-muted">areas to optimize</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Grouped by critical and minor impact</p>
        </div>
      </div>

      {/* Score Evolution Trendline across uploads */}
      {versions.length >= 2 && (
        <ResumeScoreEvolutionChart versions={versions} />
      )}

      {/* 3. Tab 1: Resume Upload & Analysis */}
      {activeTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Drag & Drop Zone */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface rounded-card border border-border p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-text-dark">Resume Document</h2>
                {file && (
                  <button
                    onClick={clearFile}
                    className="text-text-muted hover:text-danger text-xs font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Large Dashed Dropzone */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5 shadow-inner'
                    : file
                    ? 'border-success/50 bg-white'
                    : 'border-border hover:border-primary/40 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      file ? 'bg-success/10 text-success' : 'bg-surface text-primary'
                    }`}
                  >
                    {file ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                  </div>

                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-text-dark truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Ready
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-text-dark">
                        Drag and drop your resume or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">Supports PDF & DOCX up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Custom Version Label */}
              <div className="mt-3">
                <label className="text-[11px] font-semibold text-text-dark flex items-center gap-1 mb-1">
                  <Tag className="h-3 w-3 text-primary" />
                  <span>Version Name / Target Role (Optional)</span>
                </label>
                <input
                  type="text"
                  value={versionLabelInput}
                  onChange={(e) => setVersionLabelInput(e.target.value)}
                  placeholder="e.g. Google SDE Application, Fintech Backend"
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-dark focus:outline-none focus:border-primary placeholder:text-text-muted"
                />
              </div>

              {/* Single Coral CTA Button */}
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="btn-accent w-full mt-4 text-xs font-bold py-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Parsing Resume with AI...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Upload & Analyze Resume</span>
                  </>
                )}
              </button>

              {successMsg && (
                <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-xl text-xs text-success flex items-start gap-2 animate-fade-up">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger flex items-start gap-2 animate-fade-up">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Quick Profile Summary Card */}
            {parsedData && (
              <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider">
                  Candidate Profile
                </h3>
                <div>
                  <p className="text-base font-bold text-text-dark">{parsedData.name || 'Candidate'}</p>
                  <p className="text-xs text-text-body">{parsedData.email}</p>
                </div>

                {parsedData.github_username && (
                  <div className="pt-2 flex items-center justify-between border-t border-border">
                    <span className="text-xs text-text-muted">Detected GitHub</span>
                    <span className="text-xs font-mono font-bold text-primary">
                      @{parsedData.github_username}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline text-left"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Customize Hierarchy & Export PDF</span>
                  </button>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share Score Badge</span>
                    </button>
                    <span className="text-border">•</span>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                  <Link
                    to="/codebase"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Analyze Codebase for this profile</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Score & Severity-Grouped Suggestions */}
          <div className="lg:col-span-7 space-y-4">
            {loading ? (
              /* High-Quality Skeleton Loading State */
              <div className="bg-surface rounded-card border border-border p-8 shadow-sm space-y-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-dark">Analyzing your resume with AI...</h3>
                    <p className="text-xs text-text-body mt-0.5">
                      Parsing document structure, validating technical skills, and scoring ATS compatibility.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span>Extracting technical skills and experience chronology...</span>
                  </div>
                  <div className="h-3 w-3/4 bg-white/80 rounded-md" />
                  <div className="h-3 w-1/2 bg-white/80 rounded-md" />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="h-20 bg-white/80 rounded-xl border border-border" />
                  <div className="h-20 bg-white/80 rounded-xl border border-border" />
                  <div className="h-20 bg-white/80 rounded-xl border border-border" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="h-14 bg-white/80 rounded-xl border border-border" />
                  <div className="h-14 bg-white/80 rounded-xl border border-border" />
                </div>
              </div>
            ) : parsedData ? (
              <>
                {/* Categorized Suggestions */}
                <div className="bg-surface rounded-card border border-border p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-text-dark">ATS Recommendations</h2>
                      <p className="text-xs text-text-body">Grouped by severity impact on recruiter scanning</p>
                    </div>
                  </div>

                  {/* Critical Issues (Red #E24B4A) */}
                  {categorized.critical.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-danger">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Critical Issues (High Priority)</span>
                      </div>
                      {categorized.critical.map((item, i) => (
                        <div
                          key={i}
                          className="bg-white border-l-4 border-danger border-t border-r border-b border-border p-3.5 rounded-r-xl text-xs text-text-dark leading-relaxed"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings (Amber with high contrast #92400E) */}
                  {categorized.warning.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        <span>Warnings (Medium Priority)</span>
                      </div>
                      {categorized.warning.map((item, i) => (
                        <div
                          key={i}
                          className="bg-white border-l-4 border-amber-500 border-t border-r border-b border-border p-3.5 rounded-r-xl text-xs text-text-dark leading-relaxed"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Minor Optimizations (Blue #185FA5) */}
                  {categorized.minor.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Info className="h-4 w-4" aria-hidden="true" />
                        <span>Minor Optimizations</span>
                      </div>
                      {categorized.minor.map((item, i) => (
                        <div
                          key={i}
                          className="bg-white border-l-4 border-primary border-t border-r border-b border-border p-3.5 rounded-r-xl text-xs text-text-dark leading-relaxed"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills Detected */}
                <div className="bg-surface rounded-card border border-border p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3">
                    Indexed Technical Skills ({parsedData.skills?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.skills?.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-medium text-text-dark"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Guided Empty State */
              <div className="bg-surface rounded-card border border-border p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px] space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-xs">
                  <FileText className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-dark">Awaiting Resume Upload</h3>
                  <p className="text-xs text-text-body max-w-sm mx-auto mt-1 leading-relaxed">
                    Upload your PDF or DOCX resume to extract verified skills, compute your ATS benchmark score, and receive targeted improvement suggestions.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-accent text-xs font-bold py-2.5 px-5"
                  >
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                    <span>Choose Resume File</span>
                  </button>
                  <button
                    onClick={handleLoadDemo}
                    className="btn-ghost text-xs font-semibold py-2.5 px-4"
                  >
                    <span>Load Demo Candidate Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* Tab 2: Interactive Resume Section Editor & ATS PDF Export */}
      {activeTab === 'editor' && (
        <ResumeSectionEditor
          parsedData={parsedData}
          onUpdateData={(updated) => setParsedData(updated)}
        />
      )}

      {/* 4. Tab 3: Secondary LinkedIn Review (Folded into ResumeATS per spec) */}
      {activeTab === 'linkedin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-text-dark">LinkedIn Profile Optimizer</h2>
                <p className="text-xs text-text-body">Paste your headline or About section to review recruiter impact</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-dark block mb-1">
                Headline or About Summary
              </label>
              <textarea
                rows={7}
                value={linkedinText}
                onChange={(e) => setLinkedinText(e.target.value)}
                placeholder="Example: Final Year CSE Student | Full Stack Developer specializing in React & Node.js | Built scalable internship management systems..."
                className="w-full p-3 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>

            <button
              onClick={handleAnalyzeLinkedin}
              disabled={!linkedinText.trim() || linkedinLoading}
              className="btn-accent w-full text-xs font-bold py-2.5 disabled:opacity-50"
            >
              {linkedinLoading ? 'Analyzing Profile Copy...' : 'Review LinkedIn Section'}
            </button>
          </div>

          <div className="lg:col-span-6">
            {linkedinLoading ? (
              <div className="bg-surface rounded-card border border-border p-8 shadow-sm space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-dark">Analyzing LinkedIn Copy with AI...</h4>
                    <p className="text-xs text-text-body">Scanning recruiter keyword density and presentation impact</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="h-20 bg-white/80 rounded-xl border border-border" />
                  <div className="h-20 bg-white/80 rounded-xl border border-border" />
                </div>
              </div>
            ) : linkedinResult ? (
              <div className="bg-surface rounded-card border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-dark">Recruiter Indexing Feedback</h3>
                  <span className="text-xs font-bold text-success font-mono">
                    Score: {linkedinResult.headlineScore}/100
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-border">
                    <p className="text-xs font-bold text-success flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Strengths
                    </p>
                    <ul className="text-xs text-text-body space-y-1 list-disc list-inside">
                      {linkedinResult.keyStrengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-border">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" /> Recommended Tweaks
                    </p>
                    <ul className="text-xs text-text-body space-y-1 list-disc list-inside">
                      {linkedinResult.improvements.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-card border border-border p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-xs">
                  <Linkedin className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-dark">Awaiting Profile Text</h4>
                  <p className="text-xs text-text-body max-w-xs mx-auto mt-1">
                    Paste your profile headline or About summary to review recruiter keyword density and presentation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkedinText('Final Year CS Student | Fullstack Engineer specializing in React, Node.js, Fastify & PostgreSQL | Built InternOps with 10k+ test events | Looking for SDE 1 Opportunities');
                  }}
                  className="btn-ghost text-xs font-semibold py-2 px-4"
                >
                  <span>Insert Sample Headline</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Clean Single-Column Printable ATS Document (Hidden from screen, displayed during print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #ats-ready-pdf-area, #ats-ready-pdf-area * {
            visibility: visible !important;
          }
          #ats-ready-pdf-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 12mm 18mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="ats-ready-pdf-area" className="hidden print:block text-slate-900 bg-white font-sans text-xs leading-relaxed space-y-4">
        {parsedData && (
          <>
            <header className="border-b border-slate-300 pb-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{parsedData.name || 'Candidate Name'}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-xs mt-1">
                {parsedData.email && <span>{parsedData.email}</span>}
                {parsedData.phone && <span>• {parsedData.phone}</span>}
                {parsedData.github_username && <span>• github.com/{parsedData.github_username}</span>}
                {parsedData.linkedin_url && <span>• {parsedData.linkedin_url}</span>}
                {parsedData.portfolio_url && <span>• {parsedData.portfolio_url}</span>}
              </div>
            </header>

            {parsedData.skills?.length > 0 && (
              <section className="space-y-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">
                  Technical Skills
                </h2>
                <p className="text-slate-700">
                  <strong className="text-slate-900">Keywords: </strong>
                  {parsedData.skills.join(', ')}
                </p>
              </section>
            )}

            {parsedData.experience?.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">
                  Work Experience
                </h2>
                <div className="space-y-2">
                  {parsedData.experience.map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline font-semibold text-slate-900 text-xs">
                        <span>{exp.role || exp.title} — <span className="font-normal text-slate-700">{exp.company}</span></span>
                        <span className="font-mono text-slate-500 text-[11px]">{exp.duration}</span>
                      </div>
                      <p className="text-slate-700">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {parsedData.education?.length > 0 && (
              <section className="space-y-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">
                  Education
                </h2>
                {parsedData.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-baseline text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{edu.degree || edu.field}</div>
                      <div className="text-slate-700">{edu.institution || edu.school}</div>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{edu.year}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* Share Score Badge Modal */}
      <ResumeShareBadgeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        parsedData={parsedData}
      />

      {/* Side-by-Side Version Comparison Modal */}
      <ResumeComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        versions={versions}
        currentVersionId={selectedVersionId}
      />
    </div>
  );
}
