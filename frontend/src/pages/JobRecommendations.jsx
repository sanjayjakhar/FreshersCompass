import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase, Globe, ExternalLink, Sparkles, Filter,
  CheckCircle2, AlertCircle, RefreshCw, Search, MapPin, Tag,
  GraduationCap, Building2, IndianRupee, Clock, Check, SlidersHorizontal,
  ArrowUpRight, ChevronDown, FileText, Linkedin, UserCheck, X, Plus,
  Layers, ArrowLeftRight, Compass, ArrowRight
} from 'lucide-react';
import { fetchLatestResume, fetchProfileFromDB } from '../services/api';

const TRACK_PRESETS = [
  {
    id: 'backend',
    label: '⚡ Backend Engineer',
    domain: 'Backend',
    skills: ['Node.js', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'REST APIs', 'Microservices'],
    description: 'APIs, distributed systems, microservices & scalable databases'
  },
  {
    id: 'frontend',
    label: '🎨 Frontend Engineer',
    domain: 'Frontend',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux', 'JavaScript', 'HTML5', 'CSS3'],
    description: 'Modern UI/UX, client state management & web performance'
  },
  {
    id: 'fullstack',
    label: '🚀 Full-Stack Developer',
    domain: 'Full-Stack',
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'PostgreSQL', 'Docker', 'REST APIs'],
    description: 'End-to-end web apps, MERN stack & cloud integrations'
  },
  {
    id: 'aiml',
    label: '🤖 AI / ML & Data',
    domain: 'AI/ML',
    skills: ['Python', 'PyTorch', 'FastAPI', 'RAG / LLMs', 'NLP', 'LangChain', 'Pandas', 'PostgreSQL'],
    description: 'LLM agents, vector embeddings & machine learning pipelines'
  },
  {
    id: 'devops',
    label: '☁️ DevOps & Cloud',
    domain: 'DevOps',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux', 'GitHub Actions'],
    description: 'Container orchestration, CI/CD pipelines & cloud reliability'
  },
  {
    id: 'systems',
    label: '☕ Core Java & Systems',
    domain: 'Backend',
    skills: ['Java', 'Spring Boot', 'Kafka', 'Redis', 'Distributed Systems', 'MySQL', 'DSA'],
    description: 'High-throughput enterprise microservices & message queues'
  }
];

export default function JobRecommendations() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Cached Profiles
  const [resumeData, setResumeData] = useState(null);
  const [linkedinData, setLinkedinData] = useState(null);

  // Active Matching Source: 'resume' | 'linkedin' | 'manual'
  const [matchSource, setMatchSource] = useState('manual');
  const [activeTrack, setActiveTrack] = useState('backend');

  // Filter States
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSkills, setActiveSkills] = useState(TRACK_PRESETS[0].skills);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);

  // Filter Constants
  const gradYears = [
    { id: 'all', label: 'All Batches' },
    { id: '2027', label: 'Batch 2027' },
    { id: '2026', label: 'Batch 2026' },
    { id: '2025', label: 'Batch 2025' },
    { id: '2024', label: 'Batch 2024' },
  ];

  const roleTypes = [
    { id: 'all', label: 'All Roles' },
    { id: 'internship', label: '🎓 Internships Only' },
    { id: 'full-time', label: '💼 Full Time Only' },
  ];

  const locations = [
    { id: 'all', label: 'All Locations' },
    { id: 'india', label: '🇮🇳 India Tech Hubs' },
    { id: 'remote', label: '🌍 Remote' },
  ];

  const domains = [
    { id: 'all', label: 'All Domains' },
    { id: 'Backend', label: 'Backend' },
    { id: 'Frontend', label: 'Frontend' },
    { id: 'Full-Stack', label: 'Full-Stack' },
    { id: 'AI/ML', label: 'AI / ML' },
    { id: 'DevOps', label: 'DevOps' },
  ];

  // 1. Initial Load: Check MongoDB and URL params
  useEffect(() => {
    const loadDataFromDB = async () => {
      let loadedResume = null;
      let loadedLinkedIn = null;

      try {
        const [res, prof] = await Promise.all([
          fetchLatestResume(),
          fetchProfileFromDB(),
        ]);
        if (res) {
          loadedResume = res;
          setResumeData(res);
        }
        if (prof?.linkedin_data) {
          loadedLinkedIn = prof.linkedin_data;
          setLinkedinData(prof.linkedin_data);
        }
      } catch (e) {
        console.error('Error reading profile/resume from MongoDB:', e);
      }

      const paramSource = searchParams.get('source');
      if (paramSource === 'resume' && loadedResume) {
        applyResumeSource(loadedResume);
      } else if (paramSource === 'linkedin' && loadedLinkedIn) {
        applyLinkedInSource(loadedLinkedIn);
      } else if (loadedResume) {
        // Default to resume if available
        applyResumeSource(loadedResume);
      } else if (loadedLinkedIn) {
        applyLinkedInSource(loadedLinkedIn);
      } else {
        // Default to Manual Track (Backend)
        applyTrackSource('backend');
      }
    };
    loadDataFromDB();
  }, []);

  // Handlers for switching sources
  const applyResumeSource = (resume = resumeData) => {
    if (!resume) return;
    setMatchSource('resume');
    setSearchParams({ source: 'resume' });
    const skills = (resume.skills && resume.skills.length > 0)
      ? resume.skills
      : ['React', 'Node.js', 'Python', 'JavaScript'];
    setActiveSkills(skills);
    setSelectedDomain('all');
  };

  const applyLinkedInSource = (lin = linkedinData) => {
    if (!lin) return;
    setMatchSource('linkedin');
    setSearchParams({ source: 'linkedin' });
    const kw = lin.recommended_keywords || [];
    const role = lin.target_role || '';
    const skills = kw.length > 0 ? kw : ['TypeScript', 'Microservices', 'Docker', 'CI/CD', 'React'];
    setActiveSkills(skills);

    if (role.toLowerCase().includes('backend')) {
      setSelectedDomain('Backend');
    } else if (role.toLowerCase().includes('frontend')) {
      setSelectedDomain('Frontend');
    } else if (role.toLowerCase().includes('ai') || role.toLowerCase().includes('data')) {
      setSelectedDomain('AI/ML');
    } else {
      setSelectedDomain('all');
    }
  };

  const applyTrackSource = (trackId) => {
    const track = TRACK_PRESETS.find((t) => t.id === trackId) || TRACK_PRESETS[0];
    setMatchSource('manual');
    setActiveTrack(trackId);
    setSearchParams({ track: trackId });
    setActiveSkills(track.skills);
    setSelectedDomain(track.domain);
  };

  // Fetch Jobs from backend API
  const fetchJobs = async (skills = activeSkills, grad = selectedGradYear, type = selectedType, loc = selectedLocation, dom = selectedDomain) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:5000/api/jobs/recommendations', {
        user_skills: skills,
        grad_year: grad,
        type,
        location: loc,
        domain: dom,
        profile_source: matchSource,
      });

      setJobs(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load real-time job feed. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch whenever core filters or active skills change
  useEffect(() => {
    fetchJobs(activeSkills, selectedGradYear, selectedType, selectedLocation, selectedDomain);
  }, [activeSkills, selectedGradYear, selectedType, selectedLocation, selectedDomain]);

  // Skill Chip Operations
  const handleRemoveSkill = (skillToRemove) => {
    const updated = activeSkills.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase());
    setActiveSkills(updated);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = newSkillInput.trim();
    if (!clean) return;
    if (!activeSkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setActiveSkills([...activeSkills, clean]);
    }
    setNewSkillInput('');
  };

  // Client-side search across jobs
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter((j) => {
      const title = (j.title || '').toLowerCase();
      const company = (j.company || '').toLowerCase();
      const location = (j.location || '').toLowerCase();
      const domain = (j.domain || '').toLowerCase();
      const tags = (j.tags || []).some((t) => t.toLowerCase().includes(q));
      return title.includes(q) || company.includes(q) || location.includes(q) || domain.includes(q) || tags;
    });
  }, [jobs, searchQuery]);

  // Avatar colors
  const getAvatarBg = (name = '') => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Live Job Recommendations
          </h1>
          <p className="text-text-body text-sm mt-1">
            Verified entry-level roles scored against your extracted skills with match progress bars.
          </p>
        </div>

        <Link
          to="/applications"
          className="btn-ghost text-xs self-start"
        >
          <span>View Application Tracker</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Live Available Positions</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-text-dark">{jobs.length}</span>
            <span className="text-xs text-text-muted">indexed roles</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Aggregated from verified portals</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Active Match Basis</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-primary capitalize">{matchSource}</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">{activeSkills.length} skills evaluated</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Highest Match Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-secondary">
              {filteredJobs.length > 0 ? Math.max(...filteredJobs.map(j => j.match_score || 0)) : 94}%
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Calculated in real-time</p>
        </div>
      </div>

        {/* ============================================================ */}
        {/* 3-WAY MATCHING SOURCE SWITCHER */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
              <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" /> Match Source:
            </div>

            {/* Profile Source Switcher Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-grow max-w-3xl">
              
              {/* Option 1: Resume */}
              <button
                onClick={() => {
                  if (resumeData) applyResumeSource(resumeData);
                  else setMatchSource('resume');
                }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  matchSource === 'resume'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>My Resume Profile</span>
                {resumeData && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    matchSource === 'resume' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {resumeData.ats_score}% ATS
                  </span>
                )}
              </button>

              {/* Option 2: LinkedIn */}
              <button
                onClick={() => {
                  if (linkedinData) applyLinkedInSource(linkedinData);
                  else setMatchSource('linkedin');
                }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  matchSource === 'linkedin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Linkedin className="h-4 w-4 shrink-0" />
                <span>LinkedIn Profile</span>
                {linkedinData && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    matchSource === 'linkedin' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {linkedinData.visibility_score || 78}%
                  </span>
                )}
              </button>

              {/* Option 3: Manual Tracks */}
              <button
                onClick={() => applyTrackSource(activeTrack || 'backend')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  matchSource === 'manual'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span>Role & Track Presets</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  matchSource === 'manual' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  Manual
                </span>
              </button>

            </div>

          </div>

          {/* Contextual Active Profile Details Banner */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            {matchSource === 'resume' && (
              <div>
                {resumeData ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {resumeData.name ? resumeData.name.slice(0, 2).toUpperCase() : 'CV'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          Matching with Resume: <span className="text-blue-700">{resumeData.name || 'Your Resume'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {activeSkills.length} skills detected • ATS Compatibility: <strong>{resumeData.ats_score}/100</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/dashboard"
                        className="px-3 py-1.5 rounded-xl bg-white text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100/50 transition-all text-xs"
                      >
                        Re-upload in Dashboard
                      </Link>
                      <button
                        onClick={() => applyTrackSource('backend')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all text-xs"
                      >
                        Switch to Track Presets
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-900">No Resume uploaded yet.</span>
                        <p className="text-amber-700 text-[11px] mt-0.5">
                          Upload your resume in the Dashboard to get personalized ATS scoring and automatic role matching.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/dashboard"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs shrink-0"
                      >
                        Upload Resume Now →
                      </Link>
                      <button
                        onClick={() => applyTrackSource('backend')}
                        className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs"
                      >
                        Use Backend Track
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {matchSource === 'linkedin' && (
              <div>
                {linkedinData ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-2xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        IN
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          Matching with LinkedIn: <span className="text-indigo-700">{linkedinData.target_role || 'Target Role'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {activeSkills.length} recruiter keywords • Visibility Score: <strong>{linkedinData.visibility_score || 78}/100</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/linkedin"
                        className="px-3 py-1.5 rounded-xl bg-white text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-100/50 transition-all text-xs"
                      >
                        Optimize in Studio
                      </Link>
                      <button
                        onClick={() => applyTrackSource('backend')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all text-xs"
                      >
                        Switch to Track Presets
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-900">No LinkedIn profile analyzed yet.</span>
                        <p className="text-amber-700 text-[11px] mt-0.5">
                          Analyze your profile in LinkedIn Studio to extract recruiter keywords and high-search role terms.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/linkedin"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs shrink-0"
                      >
                        Analyze LinkedIn Profile →
                      </Link>
                      <button
                        onClick={() => applyTrackSource('backend')}
                        className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs"
                      >
                        Use Backend Track
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {matchSource === 'manual' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Select a Technical Track / Role:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click any track to instantly filter jobs & set skill match
                  </span>
                </div>

                {/* 1-Click Track Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {TRACK_PRESETS.map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => applyTrackSource(tr.id)}
                      className={`p-2.5 rounded-2xl text-xs font-bold text-left transition-all border ${
                        activeTrack === tr.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      <div className="line-clamp-1">{tr.label}</div>
                      <div className={`text-[10px] font-normal mt-0.5 line-clamp-1 ${
                        activeTrack === tr.id ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {tr.domain}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Skills Chips Row (Editable in any mode!) */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-emerald-600" /> Active Matching Skills ({activeSkills.length}):
              </span>
              <span className="text-[11px] text-slate-400">
                Click × to remove or add your own below
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {activeSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200 group"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                    title={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* Add Skill Mini Form */}
              <form onSubmit={handleAddSkill} className="inline-flex items-center">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="+ Add skill..."
                  className="px-2.5 py-1 bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-28"
                />
              </form>
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* UNIFIED SEARCH & FILTER CONTROL BAR */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm mb-6 space-y-3">
          
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company (CRED, Swiggy...), role (Backend, Frontend...), or tech stack..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all shrink-0 ${
                showFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showFilters ? 'Hide Filters' : 'Batch, Domain & Hub Filters'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => fetchJobs()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-all shrink-0 active:scale-95"
              title="Refresh job feed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Quick Domain & Role Type Pills (Always visible!) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            
            {/* Domain Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-500 text-[11px] mr-1">Domain:</span>
              {domains.map((dom) => (
                <button
                  key={dom.id}
                  onClick={() => setSelectedDomain(dom.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs ${
                    selectedDomain === dom.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dom.label}
                </button>
              ))}
            </div>

            {/* Quick Location Pills */}
            <div className="flex items-center gap-1.5">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs ${
                    selectedLocation === loc.id
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                      : 'bg-slate-100/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>

          </div>

          {/* Expandable Advanced Options (Batch Year & Role Type) */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-up">
              
              {/* Batch Year Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 w-28 shrink-0">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-600" /> Batch Year:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {gradYears.map((gy) => (
                    <button
                      key={gy.id}
                      onClick={() => setSelectedGradYear(gy.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedGradYear === gy.id
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {gy.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Type Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 w-28 shrink-0">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Role Type:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {roleTypes.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => setSelectedType(rt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedType === rt.id
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Counter Info & Reset Filter */}
        <div className="flex items-center justify-between mb-5 px-1">
          <span className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-900 font-bold">{filteredJobs.length}</strong> opportunities
            {selectedDomain !== 'all' && <span> in <strong className="text-blue-600 font-semibold">{selectedDomain}</strong></span>}
          </span>
          
          {(selectedGradYear !== 'all' || selectedType !== 'all' || selectedLocation !== 'all' || selectedDomain !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedGradYear('all');
                setSelectedType('all');
                setSelectedLocation('all');
                setSelectedDomain('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-8 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-slate-200/80 p-6 h-56 flex flex-col justify-between shadow-xs">
                <div className="flex gap-3 items-center">
                  <div className="w-11 h-11 bg-slate-200 rounded-2xl" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-8 bg-slate-100 rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredJobs.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No roles matched current filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Try selecting "All Domains" or clearing specific search keywords to view all opportunities.
            </p>
            <button
              onClick={() => {
                setSelectedGradYear('all');
                setSelectedType('all');
                setSelectedLocation('all');
                setSelectedDomain('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
            >
              Show All Roles
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* JOB CARDS GRID */}
        {/* ============================================================ */}
        {!loading && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredJobs.map((job) => {
              const avatarClass = getAvatarBg(job.company);
              const initials = (job.company || 'TC').slice(0, 2).toUpperCase();

              // Clean color-coded match badge
              const score = job.match_score || 75;
              const matchBadgeClass =
                score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs' :
                score >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-2xs' :
                'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <div
                  key={job.id}
                  className="relative bg-white rounded-3xl border border-slate-200/90 hover:border-blue-400/90 p-6 sm:p-7 shadow-[0_4px_20px_rgba(30,58,138,0.04)] hover:shadow-[0_16px_36px_rgba(37,99,235,0.12)] transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between group overflow-hidden"
                >
                  {/* Glowing electric blue-indigo top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 opacity-90 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Header Row: Company Avatar + Title + Match Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3.5 pt-1">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs border border-blue-100 group-hover:scale-105 transition-transform ${avatarClass}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              {job.company}
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 inline" />
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Hiring
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              • {job.source}
                            </span>
                          </div>
                          
                          <h3 className="font-extrabold text-slate-950 text-base sm:text-lg group-hover:text-blue-600 transition-colors line-clamp-1 mt-1">
                            {job.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 w-28">
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-bold text-text-dark font-mono">{score}% Match</span>
                          <Sparkles className="h-3 w-3 text-secondary" />
                        </div>
                        {/* Small Teal Progress Bar */}
                        <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-border/60">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted mt-1 font-medium">
                          {matchSource === 'resume' ? 'Resume match' : matchSource === 'linkedin' ? 'LinkedIn match' : 'Track match'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Badges (Stipend, Batch, Location, Type, Domain) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3.5">
                      {job.stipend_salary && (
                        <span className="inline-flex items-center gap-1 font-extrabold text-success bg-white px-2.5 py-1 rounded-xl border border-border text-xs shadow-2xs">
                          💰 {job.stipend_salary}
                        </span>
                      )}

                      {job.domain && (
                        <span className="inline-flex items-center gap-1 font-bold text-primary bg-white px-2.5 py-1 rounded-xl border border-border text-[11px]">
                          ⚡ {job.domain}
                        </span>
                      )}

                      {job.type && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white text-text-dark border border-border">
                          {job.type}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-text-body bg-white px-2.5 py-1 rounded-xl border border-border text-[11px]">
                        <MapPin className="h-3 w-3 text-text-muted" />
                        {job.location}
                      </span>

                      {job.grad_year && Array.isArray(job.grad_year) && (
                        <span className="text-[11px] font-semibold text-text-dark bg-white px-2.5 py-1 rounded-xl border border-border">
                          🎓 Batch {job.grad_year.join('/')}
                        </span>
                      )}
                    </div>

                    {/* Excerpt */}
                    <p className="text-xs text-text-body leading-relaxed line-clamp-2 mb-4">
                      {job.description}
                    </p>

                    {/* Skills Alignment: Matched vs Missing */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {job.matched_skills && job.matched_skills.slice(0, 4).map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-success text-[11px] font-bold border border-success/30 shadow-2xs"
                        >
                          <Check className="h-3 w-3 text-success" /> {m}
                        </span>
                      ))}

                      {job.missing_skills && job.missing_skills.slice(0, 3).map((ms, msIdx) => (
                        <span
                          key={msIdx}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl bg-white text-text-muted text-[11px] font-medium border border-border"
                        >
                          +{ms}
                        </span>
                      ))}
                    </div>

                  </div>

                  {/* Apply Footer with Coral CTA */}
                  <div className="pt-3.5 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      <span>Direct Careers Portal</span>
                    </div>
                    {/* Single Coral CTA (#D85A30) */}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-accent text-xs font-bold py-2 px-4 inline-flex items-center gap-1.5"
                    >
                      <span>Apply Now</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
