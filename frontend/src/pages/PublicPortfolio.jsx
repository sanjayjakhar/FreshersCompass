import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Globe, Github, Mail, Linkedin, ExternalLink, CheckCircle2,
  Sparkles, Award, Briefcase, GraduationCap, Code2, Copy, Check,
  ArrowRight, ShieldCheck, Cpu, Terminal
} from 'lucide-react';
import { fetchPublicProfile } from '../services/api';

export default function PublicPortfolio() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await fetchPublicProfile(username || 'developer');
        if (isMounted) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to load public profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (username) {
      loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [username]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl border border-border p-8 shadow-sm space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface"></div>
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-surface rounded w-1/3"></div>
              <div className="h-4 bg-surface rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-4 bg-surface rounded w-full"></div>
            <div className="h-4 bg-surface rounded w-5/6"></div>
            <div className="h-4 bg-surface rounded w-4/6"></div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="h-20 bg-surface rounded-xl"></div>
            <div className="h-20 bg-surface rounded-xl"></div>
            <div className="h-20 bg-surface rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const name = profile?.candidate_name || username || 'Developer Candidate';
  const headline = profile?.headline || 'Fullstack Engineer & Systems Builder';
  const bio = profile?.bio || profile?.about || 'Software engineer specializing in modern web applications, scalable APIs, and distributed systems.';
  const githubUser = profile?.github_username || username;
  const email = profile?.email;
  const readiness = profile?.readiness_score || 85;
  const ats = profile?.ats_score || 84;
  const competencies = profile?.competency_scores || {
    resume: 85,
    code: 82,
    interview: 80,
    roadmap: 78,
    velocity: 86,
  };
  const skills = profile?.skills || ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Tailwind CSS', 'Git'];
  const featuredProject = profile?.featured_project || 'FreshersCompass Platform';
  const projectTech = profile?.project_tech || 'React, Node.js, Express, MongoDB, Tailwind CSS';
  const projectDesc = profile?.project_description || 'Next-generation AI career acceleration platform for early-career developers.';
  const experience = profile?.experience || [];
  const education = profile?.education || [];
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-bg-light text-text-dark flex flex-col font-sans selection:bg-primary/10 selection:text-primary">
      {/* 1. Public Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-border/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
              FC
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-primary leading-tight">
                FreshersCompass
              </span>
              <span className="text-[10px] text-text-muted font-medium">Public Developer Portfolio</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-text-body hover:bg-surface hover:text-text-dark transition shadow-2xs"
              title="Copy portfolio link"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-success">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-text-muted" />
                  <span>Share Profile</span>
                </>
              )}
            </button>

            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-2xs transition"
            >
              <span>Build Yours Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-up">
        {/* Verification Alert Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Verified Candidate Twin:</strong> Identity, code contributions, and resume telemetry authenticated by FreshersCompass.
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-primary/20 font-mono text-[10px] text-primary font-bold">
            100% Deterministic
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border/80">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface border border-border/80 flex items-center justify-center font-black text-2xl text-primary shrink-0 shadow-2xs">
                {initials || 'FC'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-text-dark tracking-tight">
                    {name}
                  </h1>
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" title="Verified Candidate" />
                </div>
                <p className="text-sm sm:text-base font-semibold text-primary">{headline}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted pt-1">
                  <span className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-medium text-text-body">
                    {profile?.target_role || 'Fullstack Developer'}
                  </span>
                  <span>•</span>
                  <span>Ready for Full-Time Roles & Internships</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              {githubUser && (
                <a
                  href={`https://github.com/${githubUser}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-text-dark hover:bg-border/40 transition shadow-2xs"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>github.com/{githubUser}</span>
                  <ExternalLink className="h-3 w-3 text-text-muted" />
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-2xs"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Contact Candidate</span>
                </a>
              )}
            </div>
          </div>

          {/* About Bio */}
          <div className="pt-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" /> Engineering Narrative & About
            </h2>
            <p className="text-xs sm:text-sm text-text-body leading-relaxed whitespace-pre-line">
              {bio}
            </p>
          </div>
        </div>

        {/* Telemetry & Verified Twin Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-text-muted font-medium">
              <span>Career Twin Readiness</span>
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-primary">{readiness}%</span>
              <span className="text-xs font-bold text-success">Verified</span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(readiness, 100)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-text-muted mt-2">Aggregate score across code, resume & mock tests</p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-text-muted font-medium">
              <span>ATS Resume Alignment</span>
              <Award className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-text-dark">{ats}%</span>
              <span className="text-xs text-text-muted">/ 100</span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(ats, 100)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-text-muted mt-2">Keyword indexing & deterministic parsing score</p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-text-muted font-medium">
              <span>Engineering Competencies</span>
              <Sparkles className="h-4 w-4 text-success" />
            </div>
            <div className="space-y-1.5 mt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Code Quality</span>
                <span className="font-bold text-text-dark">{competencies.code || 80}%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Interview Defense</span>
                <span className="font-bold text-text-dark">{competencies.interview || 78}%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Git Velocity</span>
                <span className="font-bold text-text-dark">{competencies.velocity || 85}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Engineering Project */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-primary" /> Featured Engineering Architecture
            </h2>
            <span className="text-[11px] text-primary font-bold">Primary Showcase</span>
          </div>

          <div className="bg-surface rounded-xl p-5 sm:p-6 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg font-black text-text-dark">{featuredProject}</h3>
              {profile?.project_url ? (
                <a
                  href={profile.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>View Repository</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : githubUser ? (
                <a
                  href={`https://github.com/${githubUser}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            <p className="text-xs sm:text-sm text-text-body leading-relaxed">{projectDesc}</p>

            <div className="pt-2 flex flex-wrap gap-1.5">
              {projectTech
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-semibold text-text-dark shadow-2xs"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Verified Technical Skills */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Verified Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-semibold text-text-dark hover:border-primary/40 transition shadow-2xs"
              >
                <Check className="h-3 w-3 text-primary" />
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Experience & Education Section */}
        {(experience.length > 0 || education.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experience */}
            {experience.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> Professional Experience
                </h2>
                <div className="space-y-4 divide-y divide-border/60">
                  {experience.map((exp, idx) => (
                    <div key={idx} className={idx > 0 ? 'pt-4' : ''}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-text-dark">
                          {exp.title || exp.role || 'Software Engineer'}
                        </h4>
                        <span className="text-[11px] text-text-muted font-mono">{exp.duration}</span>
                      </div>
                      <p className="text-xs font-semibold text-primary mt-0.5">{exp.company}</p>
                      {exp.description && (
                        <p className="text-xs text-text-body mt-2 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" /> Formal Education
                </h2>
                <div className="space-y-4 divide-y divide-border/60">
                  {education.map((edu, idx) => (
                    <div key={idx} className={idx > 0 ? 'pt-4' : ''}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-text-dark">
                          {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                        </h4>
                        <span className="text-[11px] text-text-muted font-mono">{edu.year}</span>
                      </div>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {edu.institution || edu.school}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Recruiter Banner */}
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-text-dark">
              Looking to hire {name.split(' ')[0]}?
            </h3>
            <p className="text-xs text-text-muted">
              Connect directly via verified email or review code repositories on GitHub.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-2xs transition"
              >
                Send Direct Email
              </a>
            )}
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-white border border-border text-xs font-semibold text-text-dark hover:bg-surface shadow-2xs transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>
            © {new Date().getFullYear()} FreshersCompass. Academic Minor Project, Birla Institute of Technology.
          </span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-primary transition">
              Home
            </Link>
            <Link to="/dashboard" className="hover:text-primary transition">
              Cockpit
            </Link>
            <a
              href="https://github.com/sanjayjakhar/FreshersCompass"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition"
            >
              GitHub Repo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
