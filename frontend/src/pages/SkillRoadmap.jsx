import { useState, useEffect, useMemo } from 'react';
import {
  Compass, CheckCircle2, Circle, AlertTriangle, ArrowRight,
  ExternalLink, Sparkles, BookOpen, Layers, Target, Code2, Cpu, Cloud, Terminal, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchLatestResume, fetchProfileFromDB } from '../services/api';

const CAREER_TRACKS = {
  fullstack: {
    id: 'fullstack',
    name: 'Full-Stack SDE',
    roleLabel: 'Full-Stack Developer / Junior SDE',
    description: 'Personalized roadmap spanning modern reactive clients, high-throughput APIs, and database engineering.',
    icon: Layers,
    milestones: [
      {
        id: 1,
        title: 'Milestone 1: Web & Backend Core',
        status: 'completed',
        description: 'Foundational API creation, request validation, and asynchronous event loops.',
        skills: ['JavaScript / ES6+', 'Node.js & Express / Fastify', 'RESTful API Design', 'Git & Branching Workflow'],
        resources: [
          { name: 'JavaScript Deep Dive (MDN)', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
          { name: 'Node.js REST API Best Practices', url: 'https://nodejs.org/en/learn' },
        ],
      },
      {
        id: 2,
        title: 'Milestone 2: Relational Databases & Auth',
        status: 'in-progress',
        description: 'Persistent data integrity, ACID transactions, and cryptographic session isolation.',
        skills: ['PostgreSQL & Schema Modeling', 'JWT & Refresh Token Rotation', 'Database Indexing & Queries', 'Transaction Isolation & Locks'],
        resources: [
          { name: 'Use The Index, Luke (SQL Tuning)', url: 'https://use-the-index-luke.com/' },
          { name: 'PostgreSQL Architecture & Indexing', url: 'https://www.postgresql.org/docs/' },
        ],
      },
      {
        id: 3,
        title: 'Milestone 3: Cloud & Containerization',
        status: 'upcoming',
        description: 'Packaging reproducible environments for zero-downtime microservice deployments.',
        skills: ['Docker & Multi-stage Builds', 'GitHub Actions CI/CD Pipeline', 'Nginx Reverse Proxy & SSL', 'Redis Caching & Rate Limiting'],
        resources: [
          { name: 'Docker Multi-stage Builds Guide', url: 'https://docs.docker.com/get-started/' },
          { name: 'Redis Caching Architecture', url: 'https://redis.io/docs/latest/develop/' },
        ],
      },
      {
        id: 4,
        title: 'Milestone 4: System Design & Production Prep',
        status: 'upcoming',
        description: 'Handling real-world high concurrent load, horizontal autoscaling, and telemetry.',
        skills: ['Load Balancing & Horizontal Scaling', 'Microservices & Message Queues', 'Observability & Structured Logging'],
        resources: [
          { name: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
          { name: 'High Scalability Patterns', url: 'http://highscalability.com/' },
        ],
      },
    ],
  },
  frontend: {
    id: 'frontend',
    name: 'Frontend Engineer',
    roleLabel: 'Frontend Engineer (React / Next.js)',
    description: 'Component architecture, reactive state, Core Web Vitals optimization, and design systems.',
    icon: Code2,
    milestones: [
      {
        id: 1,
        title: 'Milestone 1: Modern DOM & React Patterns',
        status: 'completed',
        description: 'Component composition, hook lifecycles, semantic HTML5, and responsive styling.',
        skills: ['JavaScript / TypeScript', 'React.js & Custom Hooks', 'Tailwind CSS & Design Tokens', 'Responsive & Accessible Web'],
        resources: [
          { name: 'React 19 Official Documentation', url: 'https://react.dev/' },
          { name: 'Web.dev Accessibility Guidelines', url: 'https://web.dev/learn/accessibility' },
        ],
      },
      {
        id: 2,
        title: 'Milestone 2: State Management & Data Fetching',
        status: 'in-progress',
        description: 'Client cache synchronization, form validation, and asynchronous server state.',
        skills: ['TanStack Query / SWR', 'Client State Management', 'Form Validation & Zod', 'REST & GraphQL Integration'],
        resources: [
          { name: 'TanStack Query Overview', url: 'https://tanstack.com/query/latest' },
          { name: 'Zod TypeScript Schema Validation', url: 'https://zod.dev/' },
        ],
      },
      {
        id: 3,
        title: 'Milestone 3: Performance & Core Web Vitals',
        status: 'upcoming',
        description: 'Code-splitting, tree-shaking, SSR/SSG rendering pipelines, and bundle analysis.',
        skills: ['Next.js App Router / SSR', 'Code-Splitting & Lazy Loading', 'Lighthouse & CWV Optimization', 'Vite & Bundler Internals'],
        resources: [
          { name: 'Next.js App Router Handbook', url: 'https://nextjs.org/docs' },
          { name: 'Web Performance Optimization', url: 'https://web.dev/fast/' },
        ],
      },
      {
        id: 4,
        title: 'Milestone 4: Automated Testing & Systems',
        status: 'upcoming',
        description: 'Component test harnesses, browser automation, and design system governance.',
        skills: ['Vitest / React Testing Library', 'Playwright E2E Automation', 'Component Storybook & CI', 'Micro-Frontends & Module Federation'],
        resources: [
          { name: 'Playwright E2E Documentation', url: 'https://playwright.dev/' },
          { name: 'Storybook Component Workshop', url: 'https://storybook.js.org/' },
        ],
      },
    ],
  },
  aiml: {
    id: 'aiml',
    name: 'AI / ML Engineer',
    roleLabel: 'AI / Machine Learning Engineer',
    description: 'LLM applications, vector embeddings, Retrieval-Augmented Generation, and inference serving.',
    icon: Cpu,
    milestones: [
      {
        id: 1,
        title: 'Milestone 1: Python & Applied Mathematics',
        status: 'completed',
        description: 'Vector linear algebra, matrix manipulation, data transformation, and scripting.',
        skills: ['Python 3 & Type Annotations', 'NumPy & Vectorized Math', 'Pandas & Data Wrangling', 'Git & Reproducible Notebooks'],
        resources: [
          { name: 'NumPy Quickstart Guide', url: 'https://numpy.org/doc/stable/user/quickstart.html' },
          { name: 'Pandas User Guide & Tutorials', url: 'https://pandas.pydata.org/docs/user_guide/index.html' },
        ],
      },
      {
        id: 2,
        title: 'Milestone 2: Deep Learning & Transformers',
        status: 'in-progress',
        description: 'Neural networks, attention mechanisms, HuggingFace transformers, and tokenization.',
        skills: ['PyTorch & Autograd', 'Transformer Architecture (BERT/GPT)', 'Hugging Face Transformers', 'Embeddings & Tokenizers'],
        resources: [
          { name: 'Hugging Face NLP Course', url: 'https://huggingface.co/learn/nlp-course' },
          { name: 'PyTorch Deep Learning Tutorials', url: 'https://pytorch.org/tutorials/' },
        ],
      },
      {
        id: 3,
        title: 'Milestone 3: Generative AI & Vector RAG',
        status: 'upcoming',
        description: 'Building grounded agents, vector databases, chunking strategies, and semantic retrieval.',
        skills: ['LangChain / LlamaIndex', 'Vector Databases (Chroma/FAISS)', 'Prompt Engineering & Context Windows', 'FastAPI & Async Inference'],
        resources: [
          { name: 'LlamaIndex Retrieval Documentation', url: 'https://docs.llamaindex.ai/' },
          { name: 'FastAPI Production Inference Guide', url: 'https://fastapi.tiangolo.com/' },
        ],
      },
      {
        id: 4,
        title: 'Milestone 4: LLMOps & Production Serving',
        status: 'upcoming',
        description: 'Quantization, inference throughput, safety guardrails, and model evaluations.',
        skills: ['vLLM / TensorRT Inference', 'RAG Triad & Evaluation (Ragas)', 'NeMo Guardrails / Safety Checks', 'Docker & GPU Containerization'],
        resources: [
          { name: 'vLLM High-Throughput Serving', url: 'https://docs.vllm.ai/' },
          { name: 'Ragas RAG Evaluation Framework', url: 'https://docs.ragas.io/' },
        ],
      },
    ],
  },
  devops: {
    id: 'devops',
    name: 'Cloud & DevOps',
    roleLabel: 'DevOps & Cloud Infrastructure Engineer',
    description: 'Container orchestration, Infrastructure as Code, CI/CD pipelines, and cloud reliability.',
    icon: Cloud,
    milestones: [
      {
        id: 1,
        title: 'Milestone 1: Linux & Scripting Foundations',
        status: 'completed',
        description: 'POSIX shell automation, network sockets, file descriptors, and version control.',
        skills: ['Linux Kernel & Shell Scripting', 'TCP/IP, DNS & HTTP Protocols', 'GitOps & Version Control', 'SSH & Key Management'],
        resources: [
          { name: 'Linux Journey Interactive Guide', url: 'https://linuxjourney.com/' },
          { name: 'Explain Shell Command Explainer', url: 'https://explainshell.com/' },
        ],
      },
      {
        id: 2,
        title: 'Milestone 2: Containers & Orchestration',
        status: 'in-progress',
        description: 'Multi-stage Docker builds, Kubernetes pods, service meshes, and Helm packaging.',
        skills: ['Docker & Container Security', 'Kubernetes Pods & Deployments', 'K8s Services & Ingress', 'Helm Charts Packaging'],
        resources: [
          { name: 'Kubernetes Official Tutorials', url: 'https://kubernetes.io/docs/tutorials/' },
          { name: 'Helm Package Manager Guide', url: 'https://helm.sh/docs/' },
        ],
      },
      {
        id: 3,
        title: 'Milestone 3: Infrastructure as Code (IaC)',
        status: 'upcoming',
        description: 'Declarative cloud provisioning, remote state locking, and CI/CD deployment pipelines.',
        skills: ['Terraform & State Locking', 'AWS (EC2, S3, RDS, IAM)', 'GitHub Actions Automation', 'Cloud Security Best Practices'],
        resources: [
          { name: 'HashiCorp Terraform Tutorials', url: 'https://developer.hashicorp.com/terraform/tutorials' },
          { name: 'AWS Cloud Practitioner Essentials', url: 'https://aws.amazon.com/training/' },
        ],
      },
      {
        id: 4,
        title: 'Milestone 4: Observability & SRE Reliability',
        status: 'upcoming',
        description: 'Prometheus metrics scrapers, Grafana dashboards, tracing, and chaos testing.',
        skills: ['Prometheus & Metrics Scraping', 'Grafana Dashboarding', 'ELK / OpenTelemetry Tracing', 'SLO / SLA & Chaos Engineering'],
        resources: [
          { name: 'Google SRE Book (Free)', url: 'https://sre.google/sre-book/table-of-contents/' },
          { name: 'Prometheus Getting Started', url: 'https://prometheus.io/docs/introduction/first_steps/' },
        ],
      },
    ],
  },
};

// Fuzzy matcher for candidate skills vs roadmap milestone requirement
function checkSkillMatch(skillName, userSkills) {
  if (!userSkills || userSkills.length === 0) return false;
  const target = skillName.toLowerCase();

  return userSkills.some((s) => {
    const raw = s.toLowerCase().trim();
    if (!raw) return false;
    if (target.includes(raw) || raw.includes(target)) return true;

    // Common synonyms and sub-skills
    if (target.includes('javascript') && (raw.includes('js') || raw.includes('javascript'))) return true;
    if (target.includes('typescript') && (raw.includes('ts') || raw.includes('typescript'))) return true;
    if (target.includes('node') && (raw.includes('node') || raw.includes('express') || raw.includes('fastify'))) return true;
    if (target.includes('react') && (raw.includes('react') || raw.includes('redux') || raw.includes('next'))) return true;
    if (target.includes('python') && (raw.includes('python') || raw.includes('fastapi') || raw.includes('django') || raw.includes('flask'))) return true;
    if (target.includes('docker') && (raw.includes('docker') || raw.includes('container'))) return true;
    if (target.includes('git') && raw.includes('git')) return true;
    if (target.includes('sql') && (raw.includes('sql') || raw.includes('postgres') || raw.includes('mysql') || raw.includes('database'))) return true;
    if (target.includes('database') && (raw.includes('mongo') || raw.includes('nosql') || raw.includes('sql') || raw.includes('db'))) return true;
    if (target.includes('tailwind') && (raw.includes('tailwind') || raw.includes('css'))) return true;
    if (target.includes('cloud') && (raw.includes('aws') || raw.includes('gcp') || raw.includes('azure') || raw.includes('cloud'))) return true;

    return false;
  });
}

export default function SkillRoadmap() {
  const [selectedTrackKey, setSelectedTrackKey] = useState('fullstack');
  const [selectedMilestone, setSelectedMilestone] = useState(1);
  const [candidateResume, setCandidateResume] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchLatestResume().catch(() => null),
      fetchProfileFromDB().catch(() => null),
    ]).then(([resume, profile]) => {
      setCandidateResume(resume);
      setCandidateProfile(profile);
      setLoading(false);

      // Auto-detect track based on candidate profile target_role or resume skills
      const roleStr = (profile?.target_role || '').toLowerCase();
      if (roleStr.includes('front') || roleStr.includes('ui') || roleStr.includes('web design')) {
        setSelectedTrackKey('frontend');
      } else if (roleStr.includes('ai') || roleStr.includes('machine') || roleStr.includes('data') || roleStr.includes('ml')) {
        setSelectedTrackKey('aiml');
      } else if (roleStr.includes('devops') || roleStr.includes('cloud') || roleStr.includes('sre') || roleStr.includes('infra')) {
        setSelectedTrackKey('devops');
      } else if (roleStr.includes('back') || roleStr.includes('api')) {
        setSelectedTrackKey('fullstack');
      }
    });
  }, []);

  const hasResume = Boolean(candidateResume);

  // Extract all candidate skills from Resume & Profile telemetry
  const candidateSkillsList = useMemo(() => {
    const skills = new Set();
    if (candidateResume?.skills && Array.isArray(candidateResume.skills)) {
      candidateResume.skills.forEach((s) => skills.add(s));
    }
    if (candidateProfile?.project_tech) {
      candidateProfile.project_tech.split(',').forEach((s) => {
        const trimmed = s.trim();
        if (trimmed) skills.add(trimmed);
      });
    }
    return Array.from(skills);
  }, [candidateResume, candidateProfile]);

  const activeTrack = CAREER_TRACKS[selectedTrackKey] || CAREER_TRACKS.fullstack;

  // Dynamically compute milestone states and skill states based on telemetry
  const computedMilestones = useMemo(() => {
    return activeTrack.milestones.map((milestone, mIdx) => {
      const skillsWithStatus = milestone.skills.map((skillName) => {
        const isMastered = checkSkillMatch(skillName, candidateSkillsList);
        if (isMastered) {
          return { name: skillName, state: 'done' };
        }
        // If not mastered, mark as gap for current/early milestones or pending for advanced
        if (mIdx <= 1) {
          return { name: skillName, state: 'gap' };
        }
        return { name: skillName, state: 'pending' };
      });

      const doneCount = skillsWithStatus.filter((s) => s.state === 'done').length;
      let status = 'upcoming';
      if (doneCount === skillsWithStatus.length) {
        status = 'completed';
      } else if (doneCount > 0 || mIdx === 0 || mIdx === 1) {
        status = 'in-progress';
      }

      return {
        ...milestone,
        status,
        skills: skillsWithStatus,
      };
    });
  }, [activeTrack, candidateSkillsList]);

  const allSkills = computedMilestones.flatMap((m) => m.skills);
  const totalSkills = allSkills.length;
  const completedSkills = allSkills.filter((s) => s.state === 'done').length;
  const gapSkillsList = allSkills.filter((s) => s.state === 'gap');
  const gapSkills = gapSkillsList.length;
  const completionPercent = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;

  const currentMilestone = computedMilestones.find((m) => m.id === selectedMilestone) || computedMilestones[0];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Career Track Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
            <Compass className="h-3.5 w-3.5" /> Dynamic Career Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Skill-Gap & Career Roadmap
          </h1>
          <p className="text-text-body text-sm mt-1 max-w-2xl">
            {activeTrack.description}
          </p>
        </div>

        <Link
          to="/career-twin"
          className="btn-ghost text-xs self-start shrink-0 flex items-center gap-1.5"
        >
          <span>View Twin Competency</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Career Track Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface rounded-2xl border border-border">
        {Object.values(CAREER_TRACKS).map((track) => {
          const Icon = track.icon;
          const isSelected = selectedTrackKey === track.id;
          return (
            <button
              key={track.id}
              onClick={() => {
                setSelectedTrackKey(track.id);
                setSelectedMilestone(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-dark hover:bg-white/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{track.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Roadmap Progress</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-secondary">{completionPercent}%</span>
            <span className="text-xs text-text-muted">completed</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
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
          <p className="text-[11px] text-text-muted mt-2 truncate">
            {gapSkillsList.length > 0
              ? gapSkillsList.slice(0, 3).map((g) => g.name.split('/')[0].split('&')[0].trim()).join(', ')
              : 'All immediate milestone skills satisfied'}
          </p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-sm">
          <span className="text-xs font-semibold text-text-body">Active Target Role</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl sm:text-2xl font-black text-text-dark truncate">
              {candidateProfile?.target_role || activeTrack.roleLabel}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Adaptive telemetry aligned with market postings</p>
        </div>
      </div>

      {/* Telemetry Synchronization Guiding Banner */}
      {!hasResume && (
        <div className="p-4 sm:p-5 bg-primary/5 border border-primary/20 rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-text-dark">
                Viewing Standard {activeTrack.name} Baseline
              </h3>
              <p className="text-[11px] sm:text-xs text-text-body mt-0.5">
                Upload your resume to automatically detect candidate skills and highlight actionable gaps for your chosen track.
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-dark">Career Milestones in Sequence</h2>
            <span className="text-xs text-text-muted">Track: <span className="font-semibold text-primary">{activeTrack.name}</span></span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {computedMilestones.map((m) => {
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
                        ? 'bg-white border-primary shadow-xs ring-1 ring-primary/20'
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
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700'
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
              {currentMilestone?.title}
            </h3>

            <p className="text-xs text-text-body leading-relaxed">
              {currentMilestone?.description}
            </p>

            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-dark">
                Recommended Resources
              </h4>
              <div className="space-y-2 text-xs">
                {currentMilestone?.resources?.map((res, rIdx) => (
                  <a
                    key={rIdx}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-white rounded-xl border border-border hover:border-primary/40 flex items-center justify-between group transition-colors shadow-2xs"
                  >
                    <span className="text-text-dark group-hover:text-primary font-medium">{res.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* Test milestone in Interview */}
            <div className="pt-2">
              <Link
                to="/interview"
                className="btn-accent w-full text-xs font-bold py-3 text-center flex items-center justify-center gap-1.5"
              >
                <span>Test This Milestone in Mock Interview</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
