import { useState, useEffect } from 'react';
import {
  Compass, CheckCircle2, Circle, AlertTriangle, ArrowRight,
  ExternalLink, Sparkles, BookOpen, Layers, Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchLatestResume } from '../services/api';

export default function SkillRoadmap() {
  const [selectedMilestone, setSelectedMilestone] = useState(1);
  const [hasResume, setHasResume] = useState(true);

  useEffect(() => {
    fetchLatestResume().then((res) => {
      setHasResume(!!res);
    });
  }, []);

  const milestones = [
    {
      id: 1,
      title: 'Milestone 1: Web & Backend Core',
      status: 'completed', // completed | in-progress | upcoming
      skills: [
        { name: 'JavaScript / ES6+', state: 'done' },
        { name: 'Node.js & Express / Fastify', state: 'done' },
        { name: 'RESTful API Design', state: 'done' },
        { name: 'Git & Branching Workflow', state: 'done' },
      ],
      description: 'Foundational API creation, request validation, and asynchronous programming.',
    },
    {
      id: 2,
      title: 'Milestone 2: Relational Databases & Auth',
      status: 'in-progress',
      skills: [
        { name: 'PostgreSQL & Schema Modeling', state: 'done' },
        { name: 'JWT & Refresh Token Rotation', state: 'done' },
        { name: 'Database Indexing & Queries', state: 'gap' },
        { name: 'Transaction Isolation & Locks', state: 'gap' },
      ],
      description: 'Persistent data integrity, ACID compliance, and secure user sessions.',
    },
    {
      id: 3,
      title: 'Milestone 3: Cloud & Containerization',
      status: 'upcoming',
      skills: [
        { name: 'Docker & Multi-stage Builds', state: 'gap' },
        { name: 'GitHub Actions CI/CD Pipeline', state: 'pending' },
        { name: 'Nginx Reverse Proxy & SSL', state: 'pending' },
        { name: 'Redis Caching & Rate Limiting', state: 'pending' },
      ],
      description: 'Packaging code for reproducible deployments and high reliability.',
    },
    {
      id: 4,
      title: 'Milestone 4: System Design & Production Prep',
      status: 'upcoming',
      skills: [
        { name: 'Load Balancing & Horizontal Scaling', state: 'pending' },
        { name: 'Microservices & Message Queues', state: 'pending' },
        { name: 'Observability & Structured Logging', state: 'pending' },
      ],
      description: 'Handling real-world traffic volume, failover, and telemetry.',
    },
  ];

  const totalSkills = milestones.flatMap((m) => m.skills).length;
  const completedSkills = milestones.flatMap((m) => m.skills).filter((s) => s.state === 'done').length;
  const gapSkills = milestones.flatMap((m) => m.skills).filter((s) => s.state === 'gap').length;
  const completionPercent = Math.round((completedSkills / totalSkills) * 100);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Skill-Gap & Career Roadmap
          </h1>
          <p className="text-text-body text-sm mt-1">
            Personalized learning path based on market demand for Entry-Level & Fullstack roles.
          </p>
        </div>

        <Link
          to="/career-twin"
          className="btn-ghost text-xs self-start"
        >
          <span>View Twin Competency</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Roadmap Progress</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-secondary">{completionPercent}%</span>
            <span className="text-xs text-text-muted">completed</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted mt-2">{completedSkills} of {totalSkills} skills mastered</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-sm">
          <span className="text-xs font-semibold text-text-body">Identified Skill Gaps</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-800">{gapSkills}</span>
            <span className="text-xs text-amber-800 font-bold">Priority gaps</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Database Indexing, Transactions, Docker</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-sm">
          <span className="text-xs font-semibold text-text-body">Active Target Role</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-text-dark">Junior SDE / Fullstack</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Aligned with verified market postings</p>
        </div>
      </div>

      {/* Profile Sync Guiding Banner for Fresh Users */}
      {!hasResume && (
        <div className="p-4 sm:p-5 bg-primary/5 border border-primary/20 rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-text-dark">
                Viewing Standard SDE Roadmap Baseline
              </h3>
              <p className="text-[11px] sm:text-xs text-text-body mt-0.5">
                Upload your resume to run an automated skill-gap analysis tailored to your verified projects.
              </p>
            </div>
          </div>
          <Link
            to="/resume"
            className="btn-accent text-xs font-bold py-2.5 px-4 shrink-0 min-h-[44px]"
          >
            <span>Upload Resume to Personalize</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* 3. Interactive Vertical Timeline Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Milestones Timeline */}
        <div className="lg:col-span-8 bg-surface rounded-card border border-border p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-text-dark">Career Milestones in Sequence</h2>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {milestones.map((m, idx) => {
              const isCompleted = m.status === 'completed';
              const isInProgress = m.status === 'in-progress';

              return (
                <div key={m.id} className="relative group">
                  {/* Timeline Node Indicator */}
                  <span
                    className={`absolute -left-[27px] sm:-left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-colors ${
                      isCompleted
                        ? 'border-success text-success'
                        : isInProgress
                        ? 'border-amber-500 text-amber-600'
                        : 'border-border text-text-muted'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isInProgress ? (
                      <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </span>

                  {/* Card Content */}
                  <div
                    onClick={() => setSelectedMilestone(m.id)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      selectedMilestone === m.id
                        ? 'bg-white border-primary shadow-xs'
                        : 'bg-white/80 border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-sm font-bold text-text-dark">{m.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                          isCompleted
                            ? 'bg-success/10 text-success'
                            : isInProgress
                            ? 'bg-warning/10 text-warning'
                            : 'bg-surface text-text-muted'
                        }`}
                      >
                        {m.status.replace('-', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-text-body mb-3">{m.description}</p>

                    {/* Skill Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {m.skills.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            s.state === 'done'
                              ? 'bg-success/5 border-success/30 text-success'
                              : s.state === 'gap'
                              ? 'bg-warning/10 border-warning/40 text-warning'
                              : 'bg-surface border-border text-text-muted'
                          }`}
                        >
                          {s.state === 'done' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : s.state === 'gap' ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Circle className="h-2.5 w-2.5" />
                          )}
                          <span>{s.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Milestone Deep Dive & Single Coral CTA */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Target className="h-4 w-4" />
              <span>Targeted Learning Plan</span>
            </div>

            <h3 className="text-base font-bold text-text-dark">
              {milestones.find((m) => m.id === selectedMilestone)?.title}
            </h3>

            <p className="text-xs text-text-body leading-relaxed">
              Recommended by AI: Focus on mastering the current gaps in this milestone to unlock top-tier compensation brackets.
            </p>

            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-dark">
                Recommended Resources
              </h4>
              <div className="space-y-2 text-xs">
                <a
                  href="https://use-the-index-luke.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-white rounded-xl border border-border hover:border-primary/40 flex items-center justify-between group transition-colors"
                >
                  <span className="text-text-dark group-hover:text-primary font-medium">Use The Index, Luke (SQL)</span>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary" />
                </a>
                <a
                  href="https://docs.docker.com/get-started/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-white rounded-xl border border-border hover:border-primary/40 flex items-center justify-between group transition-colors"
                >
                  <span className="text-text-dark group-hover:text-primary font-medium">Docker Foundations</span>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary" />
                </a>
              </div>
            </div>

            {/* Single Coral CTA (#D85A30) */}
            <div className="pt-2">
              <Link
                to="/interview"
                className="btn-accent w-full text-xs font-bold py-3 text-center"
              >
                <span>Test This Milestone in Mock Interview</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
