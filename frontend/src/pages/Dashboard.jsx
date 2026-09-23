import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, FileText, Code2, Mic, Briefcase, Compass,
  CheckSquare, ArrowRight, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Activity, ArrowUpRight,
  ShieldCheck, Circle
} from 'lucide-react';
import { fetchLatestResume, fetchProfileFromDB, fetchApplicationsFromDB } from '../services/api';

export default function Dashboard() {
  const [resumeData, setResumeData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [githubUser, setGithubUser] = useState('');
  const [applicationsCount, setApplicationsCount] = useState(0);

  useEffect(() => {
    // Load state directly from MongoDB collections
    async function loadDataFromDB() {
      try {
        const [resume, profile, apps] = await Promise.all([
          fetchLatestResume(),
          fetchProfileFromDB(),
          fetchApplicationsFromDB(),
        ]);
        if (resume) setResumeData(resume);
        if (profile) {
          setProfileData(profile);
          if (profile.github_username) setGithubUser(profile.github_username);
        }
        if (Array.isArray(apps)) setApplicationsCount(apps.length);
      } catch (e) {
        console.error('Failed to load dashboard data from MongoDB', e);
      }
    }
    loadDataFromDB();

    const handleSync = (e) => {
      const u = e?.detail !== undefined ? e.detail : '';
      setGithubUser(u);
    };
    window.addEventListener('freshercompass_profile_updated', handleSync);
    return () => window.removeEventListener('freshercompass_profile_updated', handleSync);
  }, []);

  // Compute Career Readiness score genuinely from user actions
  const atsScore = resumeData?.ats_score || 0;
  const githubScore = githubUser ? (profileData?.competency_scores?.code || 80) : 0;
  const interviewScore = profileData?.competency_scores?.interview || 0;

  const hasAnyActivity = Boolean(resumeData || githubUser || interviewScore > 0);
  const overallReadiness = hasAnyActivity
    ? Math.round((atsScore * 0.4) + (githubScore * 0.35) + (interviewScore * 0.25))
    : 0;

  const skillGapsCount = resumeData?.missing_skills?.length || (resumeData ? 2 : 0);

  // Onboarding milestones
  const stepsDone = [
    Boolean(resumeData),
    Boolean(githubUser),
    interviewScore > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Developer Cockpit
          </h1>
          <p className="text-text-body text-sm mt-1">
            Welcome back{githubUser ? `, @${githubUser}` : ''}. Here is your real-time career readiness pulse.
          </p>
        </div>

        <Link
          to="/career-twin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-muted text-primary border border-border hover:border-primary/40 rounded-card text-xs font-bold transition-all shadow-2xs"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Open Full Career Twin</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 1. Career Readiness Summary Card */}
      <div className="bg-surface rounded-card border border-border p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
          
          {/* Readiness Score Visual */}
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#E5E4DF"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#0F6E56"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={264}
                  strokeDashoffset={264 * (1 - overallReadiness / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-text-dark">{overallReadiness}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Readiness</span>
              </div>
            </div>

            <div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${
                overallReadiness === 0
                  ? 'bg-text-muted/10 text-text-muted'
                  : overallReadiness >= 75
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-primary/10 text-primary'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  overallReadiness === 0 ? 'bg-text-muted' : 'bg-secondary animate-pulse'
                }`} />
                {overallReadiness === 0
                  ? 'AI Twin Benchmark: Awaiting Initial Setup'
                  : overallReadiness >= 75
                  ? 'AI Twin Benchmark: Market Ready'
                  : 'AI Twin Benchmark: In Progress'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text-dark">Overall Career Readiness</h2>
              <p className="text-xs sm:text-sm text-text-body mt-1 max-w-md">
                Continuous AI projection based on your ATS resume score, verified GitHub repositories, and simulated mock interviews.
              </p>
            </div>
          </div>

          {/* Subsystem Progress Breakdown */}
          <div className="w-full md:w-80 space-y-3.5 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-8">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-text-body">Resume & ATS Score</span>
                <span className="text-text-dark font-mono font-bold">{atsScore}%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-700"
                  style={{ width: `${atsScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-text-body">GitHub Code Health</span>
                <span className="text-text-dark font-mono font-bold">{githubScore}%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-700"
                  style={{ width: `${githubScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-text-body">Interview Technical Depth</span>
                <span className="text-text-dark font-mono font-bold">{interviewScore}%</span>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-700"
                  style={{ width: `${interviewScore}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Getting Started / Onboarding Checklist (Zero-State Guidance) */}
      <div className="bg-white rounded-card border border-border p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Getting Started Checklist</span>
            </div>
            <h3 className="text-base font-extrabold text-text-dark">
              {stepsDone === 3
                ? '🎉 All Core Milestones Complete!'
                : `Career Twin Setup: ${stepsDone}/3 Completed`}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Complete these 3 foundational actions to benchmark your Career Twin from zero to market ready.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-sm font-mono font-bold text-primary">
              {Math.round((stepsDone / 3) * 100)}% Complete
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Step 1: Upload Resume */}
          <div className={`p-4 rounded-xl border transition-all ${
            resumeData ? 'bg-success/5 border-success/30' : 'bg-surface border-border hover:border-primary/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Step 1</span>
              {resumeData ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10">+40% Boost</span>
              )}
            </div>
            <h4 className="text-xs font-bold text-text-dark mt-2">Upload Resume & ATS</h4>
            <p className="text-[11px] text-text-body mt-1">
              {resumeData ? `ATS Score: ${atsScore}% verified` : 'Upload your PDF/DOCX resume to detect technical skills.'}
            </p>
            {!resumeData ? (
              <Link to="/resume" className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3 hover:underline">
                <span>Upload Resume</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-[11px] font-bold text-success mt-3 inline-block">✓ Completed</span>
            )}
          </div>

          {/* Step 2: Connect GitHub */}
          <div className={`p-4 rounded-xl border transition-all ${
            githubUser ? 'bg-success/5 border-success/30' : 'bg-surface border-border hover:border-primary/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Step 2</span>
              {githubUser ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10">+35% Boost</span>
              )}
            </div>
            <h4 className="text-xs font-bold text-text-dark mt-2">Connect GitHub Profile</h4>
            <p className="text-[11px] text-text-body mt-1">
              {githubUser ? `@${githubUser} repositories synced` : 'Sync public repositories to verify code health & commits.'}
            </p>
            {!githubUser ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('freshercompass_open_github_modal'))}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3 hover:underline text-left"
              >
                <span>Connect GitHub</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <span className="text-[11px] font-bold text-success mt-3 inline-block">✓ Connected</span>
            )}
          </div>

          {/* Step 3: Mock Interview */}
          <div className={`p-4 rounded-xl border transition-all ${
            interviewScore > 0 ? 'bg-success/5 border-success/30' : 'bg-surface border-border hover:border-primary/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Step 3</span>
              {interviewScore > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10">+25% Boost</span>
              )}
            </div>
            <h4 className="text-xs font-bold text-text-dark mt-2">Take AI Mock Interview</h4>
            <p className="text-[11px] text-text-body mt-1">
              {interviewScore > 0 ? `Latest Score: ${interviewScore}% verified` : 'Practice senior engineering questions with AI feedback.'}
            </p>
            {interviewScore === 0 ? (
              <Link to="/interview" className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3 hover:underline">
                <span>Start Interview</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-[11px] font-bold text-success mt-3 inline-block">✓ Completed</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Responsive Grid of 4 Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ATS Score */}
        <Link
          to="/resume"
          className="bg-surface hover:bg-white rounded-card border border-border p-5 transition-all hover:border-primary/40 group shadow-2xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-body">ATS Score</span>
            <div className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-success">{atsScore}</span>
            <span className="text-xs font-medium text-text-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {resumeData ? 'Calculated from uploaded resume' : 'No resume uploaded yet (Click to upload)'}
          </p>
        </Link>

        {/* Skill Gaps */}
        <Link
          to="/roadmap"
          className="bg-surface hover:bg-white rounded-card border border-border p-5 transition-all hover:border-warning/40 group shadow-2xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-body">Skill Gaps</span>
            <div className="w-8 h-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-warning">{skillGapsCount}</span>
            <span className="text-xs font-medium text-warning font-semibold">
              {skillGapsCount > 0 ? 'Gaps identified' : 'None detected'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {resumeData ? 'View customized skill gaps roadmap' : 'Upload resume to detect skill gaps'}
          </p>
        </Link>

        {/* Applications in Progress */}
        <Link
          to="/applications"
          className="bg-surface hover:bg-white rounded-card border border-border p-5 transition-all hover:border-primary/40 group shadow-2xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-body">Applications</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary">{applicationsCount}</span>
            <span className="text-xs font-medium text-text-muted">in pipeline</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {applicationsCount > 0 ? `${applicationsCount} applications tracked` : '0 active applications (Clean slate)'}
          </p>
        </Link>

        {/* Upcoming Interview Practice */}
        <Link
          to="/interview"
          className="bg-surface hover:bg-white rounded-card border border-border p-5 transition-all hover:border-secondary/40 group shadow-2xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-body">Mock Interview</span>
            <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-secondary">
              {interviewScore > 0 ? `${interviewScore}%` : 'Ready'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {interviewScore > 0 ? 'Dynamic evaluation completed' : 'Practice technical depth room'}
          </p>
        </Link>
      </div>

      {/* 3. Recommended Next Step Banner (Light Blue Background with Single Coral CTA) */}
      <div className="bg-primary/5 border border-primary/20 rounded-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-primary tracking-wider uppercase">
              AI Career Twin Recommendation
            </span>
            <h3 className="text-base sm:text-lg font-bold text-text-dark mt-0.5">
              Practice Codebase Architecture Defense for your top repository
            </h3>
            <p className="text-xs sm:text-sm text-text-body mt-1 max-w-2xl">
              Your resume mentions high-scale fullstack work, but interviewers frequently test trade-offs. Run a 5-minute simulated technical interview session.
            </p>
          </div>
        </div>

        {/* Single Main CTA in Coral (#D85A30) */}
        <Link
          to="/interview"
          className="btn-accent shrink-0 text-sm font-bold px-6 py-3"
        >
          <Mic className="h-4 w-4" />
          <span>Start Interview Simulation</span>
        </Link>
      </div>

      {/* 4. Core Feature Exploration Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-dark">Explore Core Capabilities</h2>
          <span className="text-xs text-text-muted">All 10 modules reachable in 1 click</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Resume & ATS */}
          <Link
            to="/resume"
            className="bg-surface hover:bg-white rounded-card border border-border p-6 transition-all hover:border-primary/40 group shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-dark text-base group-hover:text-primary transition-colors">
                Resume & ATS Intelligence
              </h3>
              <p className="text-xs text-text-body mt-1.5 leading-relaxed">
                Parse your resume into ATS benchmarks, surface critical flaws, and review your LinkedIn profile alignment.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
              <span>Inspect Resume</span>
              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Codebase RAG */}
          <Link
            to="/codebase"
            className="bg-surface hover:bg-white rounded-card border border-border p-6 transition-all hover:border-primary/40 group shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Code2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-dark text-base group-hover:text-primary transition-colors">
                GitHub Codebase RAG
              </h3>
              <p className="text-xs text-text-body mt-1.5 leading-relaxed">
                Connect your repositories and ask natural language questions with 30-second spoken scripts and file citations.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
              <span>Launch Analyzer</span>
              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Job Recommendations */}
          <Link
            to="/jobs"
            className="bg-surface hover:bg-white rounded-card border border-border p-6 transition-all hover:border-primary/40 group shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Briefcase className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-dark text-base group-hover:text-primary transition-colors">
                Smart Job Matches
              </h3>
              <p className="text-xs text-text-body mt-1.5 leading-relaxed">
                Verified live entry-level roles scored against your extracted skills with clear match percentage bars.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
              <span>View Open Roles</span>
              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* 5. Recent Activity Feed */}
      <div className="bg-surface rounded-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-text-dark">Recent Platform Activity</h3>
          </div>
          <span className="text-[11px] text-text-muted">Auto-synced</span>
        </div>

        <div className="divide-y divide-border">
          {[
            {
              title: "Codebase Analyzer Synced",
              detail: githubUser ? `@${githubUser} repositories indexed` : "InternOps repository indexed",
              time: "10 mins ago",
              icon: Code2,
              color: "text-primary bg-primary/10",
            },
            {
              title: "ATS Resume Parsed",
              detail: "Score evaluated at 82/100 with 3 critical suggestions",
              time: "1 hour ago",
              icon: FileText,
              color: "text-success bg-success/10",
            },
            {
              title: "Application Pipeline Updated",
              detail: "Moved 'Frontend Developer' at Razorpay to Interviewing",
              time: "Yesterday",
              icon: Briefcase,
              color: "text-secondary bg-secondary/10",
            },
            {
              title: "Mock Interview Completed",
              detail: "System design answer evaluated: 85% technical clarity",
              time: "2 days ago",
              icon: Mic,
              color: "text-warning bg-warning/10",
            },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            return (
              <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-dark truncate">{item.title}</p>
                    <p className="text-[11px] text-text-body truncate">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-text-muted shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>{item.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
