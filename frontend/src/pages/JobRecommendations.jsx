import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Briefcase, Globe, ExternalLink, Sparkles, Filter,
  CheckCircle2, AlertCircle, RefreshCw, Search, MapPin, Tag,
  GraduationCap, Building2, IndianRupee, Clock, Check, SlidersHorizontal,
  ArrowUpRight, ChevronDown
} from 'lucide-react';

export default function JobRecommendations() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillsInput, setSkillsInput] = useState('React, Node.js, Python, MongoDB, JavaScript');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradYear, setSelectedGradYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);

  const gradYears = [
    { id: 'all', label: 'All Batches' },
    { id: '2027', label: 'Batch 2027' },
    { id: '2026', label: 'Batch 2026' },
    { id: '2025', label: 'Batch 2025' },
    { id: '2024', label: 'Batch 2024' },
  ];

  const roleTypes = [
    { id: 'all', label: 'All Roles', count: '50+' },
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
    { id: 'Full-Stack', label: 'Full-Stack' },
    { id: 'Frontend', label: 'Frontend' },
    { id: 'Backend', label: 'Backend' },
    { id: 'AI/ML', label: 'AI / ML' },
    { id: 'DevOps', label: 'DevOps' },
  ];

  const presetSkills = [
    { label: '⚡ MERN Stack', value: 'React, Node.js, Express, MongoDB, JavaScript' },
    { label: '🤖 Python & AI', value: 'Python, FastAPI, PyTorch, LangChain, PostgreSQL' },
    { label: '☕ Java & Systems', value: 'Java, Spring Boot, Microservices, Redis, Kafka' },
  ];

  const fetchJobs = async (skills = skillsInput, grad = selectedGradYear, type = selectedType, loc = selectedLocation, dom = selectedDomain) => {
    setLoading(true);
    setError(null);

    const skillsArray = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await axios.post('http://localhost:5000/api/jobs/recommendations', {
        user_skills: skillsArray,
        grad_year: grad,
        type,
        location: loc,
        domain: dom,
      });

      setJobs(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load real-time job feed. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(skillsInput, selectedGradYear, selectedType, selectedLocation, selectedDomain);
  }, [selectedGradYear, selectedType, selectedLocation, selectedDomain]);

  // Client-side instant search
  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = (j.title || '').toLowerCase().includes(q);
    const matchesCompany = (j.company || '').toLowerCase().includes(q);
    const matchesLocation = (j.location || '').toLowerCase().includes(q);
    const matchesTags = (j.tags || []).some((t) => t.toLowerCase().includes(q));
    const matchesDomain = (j.domain || '').toLowerCase().includes(q);

    return matchesTitle || matchesCompany || matchesLocation || matchesTags || matchesDomain;
  });

  // Helper for company initial avatar colors
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
    <div className="pt-24 pb-20 min-h-screen bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Clean, Airy Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-3 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Curated for Indian College Freshers & Global Devs
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Live Tech Openings
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Real-time internships & fresher jobs from CRED, Swiggy, Zomato, Razorpay, PhonePe, Flipkart & global remote hubs. Matched against your skills.
          </p>
        </div>

        {/* Clean Unified Control Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm mb-8 space-y-4 transition-all">
          
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company (CRED, Swiggy...), role (Frontend, Backend...), or tech stack..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-2xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold border transition-all shrink-0 ${
                showAdvanced
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showAdvanced ? 'Simple View' : 'Filter by Batch & Stack'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => fetchJobs()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-all shrink-0 active:scale-95"
              title="Refresh job feed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Primary Quick Filter Pills (Type & Hubs) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
            {/* Opportunity Type Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {roleTypes.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => setSelectedType(rt.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                    selectedType === rt.id
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-slate-100/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {/* Quick Location Pills */}
            <div className="flex items-center gap-1.5">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
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

          {/* Expandable Advanced Options (Batch Year, Domain, Skills) */}
          {showAdvanced && (
            <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-up">
              
              {/* Batch Year Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 w-32 shrink-0">
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

              {/* Domain Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 w-32 shrink-0">
                  <Tag className="h-3.5 w-3.5 text-purple-600" /> Domain:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {domains.map((dom) => (
                    <button
                      key={dom.id}
                      onClick={() => setSelectedDomain(dom.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedDomain === dom.id
                          ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {dom.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Match Bar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Match Against Your Skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {presetSkills.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSkillsInput(p.value);
                          fetchJobs(p.value);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors font-medium"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                    placeholder="e.g. React, Node.js, Python, MongoDB"
                    className="flex-grow px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => fetchJobs()}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0"
                  >
                    Match Skills
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between mb-6 px-1">
          <span className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-900 font-bold">{filteredJobs.length}</strong> opportunities
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
              Reset Filters
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

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-slate-200/80 p-6 h-52 flex flex-col justify-between shadow-xs">
                <div className="flex gap-3 items-center">
                  <div className="w-11 h-11 bg-slate-200 rounded-2xl" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
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
              Try switching your graduation year or clearing specific search keywords.
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

        {/* Lovely Smooth Job Cards */}
        {!loading && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredJobs.map((job) => {
              const avatarClass = getAvatarBg(job.company);
              const initials = (job.company || 'TC').slice(0, 2).toUpperCase();

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.08)] hover:border-blue-500/30 transition-all duration-300 ease-out hover:-translate-y-1 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Row: Company Avatar + Title + Match */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${avatarClass}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {job.company}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">•</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {job.source}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1 mt-0.5">
                            {job.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                          {job.match_score || 75}%
                        </span>
                      </div>
                    </div>

                    {/* Metadata Badges (Stipend, Batch, Location) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3.5">
                      {job.stipend_salary && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-xl border border-emerald-200/60 text-[11px]">
                          💰 {job.stipend_salary}
                        </span>
                      )}

                      {job.type && (
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${
                          job.type.toLowerCase().includes('intern')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {job.type}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60 text-[11px]">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {job.location}
                      </span>

                      {job.grad_year && Array.isArray(job.grad_year) && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200/60">
                          🎓 Batch {job.grad_year.join('/')}
                        </span>
                      )}
                    </div>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-4">
                      {job.description}
                    </p>

                    {/* Matched skills pill preview */}
                    {job.matched_skills && job.matched_skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {job.matched_skills.slice(0, 3).map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold"
                          >
                            <Check className="h-2.5 w-2.5" /> {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Apply Footer */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      Direct Careers Portal
                    </span>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-blue-500/25 active:scale-95"
                    >
                      <span>Apply on Portal</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
