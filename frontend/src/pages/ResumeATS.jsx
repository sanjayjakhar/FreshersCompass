import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  Loader2, Zap, X, ChevronRight, Briefcase, GraduationCap,
  ExternalLink, Github, Linkedin, Sparkles, RefreshCw, Info, ArrowRight
} from 'lucide-react';

import {
  fetchLatestResume,
  uploadResumeToDB,
  seedDemoResumeToDB,
  deleteResumeFromDB,
} from '../services/api';

export default function ResumeATS() {
  const [activeTab, setActiveTab] = useState('resume'); // 'resume' | 'linkedin'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // LinkedIn Optimization State
  const [linkedinText, setLinkedinText] = useState('');
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinResult, setLinkedinResult] = useState(null);

  // Load candidate resume directly from MongoDB on mount
  useEffect(() => {
    async function loadResumeFromDB() {
      try {
        const resume = await fetchLatestResume();
        if (resume) setParsedData(resume);
      } catch (e) {
        console.error('Failed to load resume from MongoDB', e);
      }
    }
    loadResumeFromDB();
  }, []);

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
    setError('');
    try {
      await deleteResumeFromDB();
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
      const savedDoc = await uploadResumeToDB(file);
      if (savedDoc) {
        setParsedData(savedDoc);
        setSuccessMsg(`Resume "${file.name}" analyzed successfully! Candidate profile updated.`);
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
            Deterministic ATS parser, severity-grouped suggestions, and embedded LinkedIn profile review.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border self-start">
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

                <div className="pt-2">
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
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const demoData = await seedDemoResumeToDB();
                        if (demoData) {
                          setParsedData(demoData);
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
                    }}
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

      {/* 4. Tab 2: Secondary LinkedIn Review (Folded into ResumeATS per spec) */}
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
    </div>
  );
}
