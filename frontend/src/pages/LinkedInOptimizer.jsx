import { useState } from 'react';
import axios from 'axios';
import {
  Linkedin, Sparkles, Copy, Check, TrendingUp, AlertCircle,
  Lightbulb, ArrowRight, RefreshCw, Key, Target, Award,
  Send, MessageSquare, Rocket, Github, CheckCircle2, UserCheck,
  Share2, FileText, ArrowUpRight
} from 'lucide-react';

function VisibilityGauge({ score, size = 110, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (score || 0) / 100);

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#059669', text: 'text-emerald-600', label: 'High Recruiter Visibility' };
    if (s >= 65) return { stroke: '#2563EB', text: 'text-blue-600', label: 'Good Visibility' };
    return { stroke: '#F59E0B', text: 'text-amber-600', label: 'Needs Optimization' };
  };

  const col = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#F1F5F9" strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={col.stroke} strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="progress-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold ${col.text} animate-count-up`}>
            {score}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">/ 100</span>
        </div>
      </div>
      <span className={`text-xs font-bold mt-2.5 px-3 py-1 rounded-full ${col.text} bg-slate-50 border border-slate-200/80 shadow-2xs`}>
        {col.label}
      </span>
    </div>
  );
}

export default function LinkedInOptimizer() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'launch_post' | 'cold_outreach'

  // Profile Optimizer state
  const [targetRole, setTargetRole] = useState('Full-Stack Software Engineer');
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [linkedinInput, setLinkedinInput] = useState('');
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState(null);

  // Launch Post state
  const [postRepoName, setPostRepoName] = useState('FreshersCompass');
  const [postDescription, setPostDescription] = useState('AI career and code intelligence platform with vector codebase RAG, real-time job feeds, and recruiter profile optimization.');
  const [postTechStack, setPostTechStack] = useState('React.js, Node.js, FastAPI, Google Gemini 2.5 Flash, MongoDB, Tailwind CSS');
  const [launchPostResult, setLaunchPostResult] = useState(null);
  const [generatingPost, setGeneratingPost] = useState(false);

  // Cold Outreach state
  const [candidateName, setCandidateName] = useState('Sanjay Jakhar');
  const [outreachRole, setOutreachRole] = useState('Software Development Engineer');
  const [outreachCollege, setOutreachCollege] = useState('Birla Institute of Technology (BIT) Mesra');
  const [outreachSkills, setOutreachSkills] = useState('React, Node.js, Python, FastAPI, MongoDB, Vector RAG');
  const [outreachResult, setOutreachResult] = useState(null);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);

  const sampleProfiles = [
    {
      role: 'Full-Stack Software Engineer',
      headline: 'Student at BIT Mesra | Full-Stack Developer | React & Node.js',
      about: 'Computer science student building full-stack web applications and developer tools. Experienced with MERN stack, Python, and microservices architecture. Seeking SDE roles for 2026.'
    },
    {
      role: 'AI & Data Systems Engineer',
      headline: 'Aspiring AI Engineer | Python | PyTorch | Vector RAG & FastAPI',
      about: 'Building autonomous AI agents and vector-grounded RAG systems. Passionate about machine learning pipelines and distributed backends.'
    }
  ];

  const loadSample = (sample) => {
    setTargetRole(sample.role);
    setHeadline(sample.headline);
    setAbout(sample.about);
    setError(null);
  };

  const handleFetchLinkedInProfile = async () => {
    if (!linkedinInput.trim()) return;
    setFetchingProfile(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:5000/api/linkedin/fetch-profile', {
        identifier: linkedinInput.trim(),
      });

      const pData = res.data?.data;
      if (pData) {
        if (pData.headline) setHeadline(pData.headline);
        if (pData.about) setAbout(pData.about);
        if (pData.name) setCandidateName(pData.name);
      }
    } catch (err) {
      console.error(err);
      setError('Could not automatically resolve LinkedIn profile. You can paste your headline and about section below.');
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleSyncFromGitHub = async () => {
    try {
      setFetchingProfile(true);
      const res = await axios.get('http://localhost:5000/api/github/user/sanjayjakhar/repos');
      const profile = res.data?.data?.profile;
      const repos = res.data?.data?.repos || [];

      if (profile) {
        setCandidateName(profile.name || 'Sanjay Jakhar');
        const topProjects = repos.slice(0, 3).map((r) => r.name).join(', ');
        setHeadline(`Full-Stack Software Engineer | Builder of ${topProjects || 'Production Web Apps'} | Open to Opportunities`);
        setAbout(`Full-Stack Developer passionate about clean architectures and developer tools. Active open-source contributor with ${repos.length} public GitHub projects including ${topProjects}. Proficient in React, Node.js, and modern cloud technologies.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleOptimize = async () => {
    if (!headline.trim() && !about.trim()) {
      setError('Please provide at least a LinkedIn headline or About section.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:5000/api/linkedin/optimize', {
        headline,
        about,
        target_role: targetRole,
      });

      setResult(res.data.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.details ||
        err.response?.data?.message ||
        'Failed to analyze LinkedIn profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLaunchPost = async () => {
    if (!postRepoName.trim()) return;
    setGeneratingPost(true);
    setError(null);

    try {
      const stackList = postTechStack.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await axios.post('http://localhost:5000/api/linkedin/launch-post', {
        repo_name: postRepoName,
        description: postDescription,
        tech_stack: stackList,
      });

      setLaunchPostResult(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate launch post. Please try again.');
    } finally {
      setGeneratingPost(false);
    }
  };

  const handleGenerateColdOutreach = async () => {
    setGeneratingOutreach(true);
    setError(null);

    try {
      const skillsList = outreachSkills.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await axios.post('http://localhost:5000/api/linkedin/cold-outreach', {
        candidate_name: candidateName,
        target_role: outreachRole,
        college: outreachCollege,
        top_skills: skillsList,
      });

      setOutreachResult(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate outreach messages. Please try again.');
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-3 shadow-xs">
            <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn Algorithmic & Outreach Suite
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Elevate Your Developer Presence
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Optimize your profile for algorithmic recruiter search, generate viral project launch posts, and create personalized cold DMs.
          </p>

          {/* Smooth Navigation Tabs */}
          <div className="mt-7 inline-flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Profile Optimizer</span>
            </button>
            <button
              onClick={() => setActiveTab('launch_post')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'launch_post'
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rocket className="h-4 w-4" />
              <span>Launch Post</span>
            </button>
            <button
              onClick={() => setActiveTab('cold_outreach')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'cold_outreach'
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Cold DMs</span>
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: PROFILE OPTIMIZER ==================== */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-fade-up">
            
            {/* Input Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              
              {/* LinkedIn URL / Username Auto-Fetch Bar */}
              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Linkedin className="h-4 w-4 text-blue-600" /> Enter Your LinkedIn Handle or URL
                  </label>
                  
                  {/* Quick GitHub Sync Button */}
                  <button
                    onClick={handleSyncFromGitHub}
                    disabled={fetchingProfile}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/60 transition-colors self-start sm:self-auto"
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span>Auto-fill from GitHub projects</span>
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      value={linkedinInput}
                      onChange={(e) => setLinkedinInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchLinkedInProfile()}
                      placeholder="e.g. linkedin.com/in/sanjayjakhar or sanjayjakhar"
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={handleFetchLinkedInProfile}
                    disabled={fetchingProfile || !linkedinInput.trim()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {fetchingProfile ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Linkedin className="h-3.5 w-3.5" />}
                    <span>Load Profile</span>
                  </button>
                </div>
              </div>

              {/* Target Role & Samples */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Target Role for Recruiter Matching
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Full-Stack Developer, AI Engineer"
                      className="font-bold text-slate-900 text-sm bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none pb-0.5 mt-0.5"
                    />
                  </div>
                </div>

                {/* Sample Buttons */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Load sample:</span>
                  {sampleProfiles.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSample(s)}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors text-xs font-medium"
                    >
                      {s.role.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs (Headline & About) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Current LinkedIn Headline
                    </label>
                    <span className="text-slate-400 text-[11px]">{headline.length} / 220 chars</span>
                  </div>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Student at BIT Mesra | React | Node.js | Python"
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Current About / Summary Section
                    </label>
                    <span className="text-slate-400 text-[11px]">{about.length} chars</span>
                  </div>
                  <textarea
                    rows={4}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Paste your current LinkedIn summary or bio..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all leading-relaxed"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleOptimize}
                  disabled={loading || (!headline.trim() && !about.trim())}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3 rounded-2xl font-bold text-xs transition-all shadow-md shadow-blue-500/25 active:scale-95"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing Recruiter Fit...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Optimize for Recruiters
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Results Showcase */}
            {result && !loading && (
              <div className="space-y-8 animate-fade-up">

                {/* Scorecard Banner */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
                  <VisibilityGauge score={result.visibility_score} size={110} />

                  <div className="flex-grow w-full">
                    <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Algorithmic Ranking Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(result.score_breakdown || {}).map(([metric, val], idx) => (
                        <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                          <span className="text-[11px] text-slate-500 capitalize block mb-1">
                            {metric.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{val}%</span>
                            <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3 High-Impact Headlines */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" /> 3 AI-Optimized Headlines
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Click Copy to paste directly into your LinkedIn headline:
                  </p>

                  <div className="space-y-3">
                    {[
                      { key: 'high_impact', title: 'High Impact & Outcome-Driven', text: result.headlines?.high_impact },
                      { key: 'technical', title: 'Technical Stack & Engineering Focus', text: result.headlines?.technical },
                      { key: 'creative', title: 'Value Proposition & Vision', text: result.headlines?.creative },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4 hover:border-blue-500/40 hover:bg-blue-50/20 transition-all group"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                            {item.title}
                          </span>
                          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.text, item.key)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 transition-colors text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95"
                        >
                          {copiedKey === item.key ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimized About Section */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-600" /> High-Converting "About" Section
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.optimized_about, 'about')}
                      className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      {copiedKey === 'about' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied About!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Full About</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    {result.optimized_about}
                  </div>
                </div>

                {/* Keywords & Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4 text-purple-600" /> High-Search Recruiter Keywords
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Sprinkle these terms in your Skills & Experience sections:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(result.recommended_keywords || []).map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold"
                        >
                          +{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" /> Profile Growth Tips
                    </h3>
                    <ul className="space-y-2">
                      {(result.actionable_tips || []).map((tip, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 2: "I BUILT THIS" LAUNCH POST ==================== */}
        {activeTab === 'launch_post' && (
          <div className="space-y-8 animate-fade-up">
            
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Rocket className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Viral "I Built This" Project Launch Post Generator
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Turn your project repository into an engaging, story-driven post with a hook, architecture highlights, and hashtags.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Project / Repository Name
                  </label>
                  <input
                    type="text"
                    value={postRepoName}
                    onChange={(e) => setPostRepoName(e.target.value)}
                    placeholder="e.g. FreshersCompass"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Tech Stack (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={postTechStack}
                    onChange={(e) => setPostTechStack(e.target.value)}
                    placeholder="e.g. React, Node.js, FastAPI, Gemini AI, MongoDB"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Project Summary & Key Features
                  </label>
                  <textarea
                    rows={3}
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    placeholder="Describe what problem this solves, what makes it technically interesting..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateLaunchPost}
                  disabled={generatingPost || !postRepoName.trim()}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3 rounded-2xl font-bold text-xs transition-all shadow-md shadow-blue-500/25 active:scale-95"
                >
                  {generatingPost ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Crafting Viral Story...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Generate Viral Launch Post
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Post Output */}
            {launchPostResult && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm animate-fade-up">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Ready to Publish</h3>
                      <p className="text-[11px] text-slate-400">High engagement formatting with hook & call to action</p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(launchPostResult.post_content, 'launch_post_content')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    {copiedKey === 'launch_post_content' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Post</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-4">
                  {launchPostResult.post_content}
                </div>

                {launchPostResult.hashtags && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Hashtags:</span>
                    {launchPostResult.hashtags.map((ht, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-medium">
                        {ht}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 3: COLD OUTREACH DMS ==================== */}
        {activeTab === 'cold_outreach' && (
          <div className="space-y-8 animate-fade-up">
            
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  High-Converting Cold Outreach DM Studio
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Personalized, polite, and role-specific outreach messages tailored for tech recruiters, college alumni, and startup founders.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Target Role</label>
                  <input
                    type="text"
                    value={outreachRole}
                    onChange={(e) => setOutreachRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">College / Institute</label>
                  <input
                    type="text"
                    value={outreachCollege}
                    onChange={(e) => setOutreachCollege(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Top Skills (Comma Separated)</label>
                  <input
                    type="text"
                    value={outreachSkills}
                    onChange={(e) => setOutreachSkills(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateColdOutreach}
                  disabled={generatingOutreach}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-7 py-3 rounded-2xl font-bold text-xs transition-all shadow-md shadow-emerald-500/25 active:scale-95"
                >
                  {generatingOutreach ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating Templates...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Generate 3 Cold DM Templates
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DMs Output */}
            {outreachResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-up">
                
                {/* 1. Recruiter Direct Pitch */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-700 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/60">
                        1. Direct Recruiter Pitch
                      </span>
                      <button
                        onClick={() => copyToClipboard(outreachResult.recruiter_dm, 'recruiter_dm')}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-xs flex items-center gap-1 active:scale-95"
                      >
                        {copiedKey === 'recruiter_dm' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                      {outreachResult.recruiter_dm}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-5 pt-3 border-t border-slate-100 block">
                    Ideal for: InMail to technical sourcers & recruiters.
                  </span>
                </div>

                {/* 2. College Alumni Referral Ask */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-emerald-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-emerald-700 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60">
                        2. Alumni Referral Ask
                      </span>
                      <button
                        onClick={() => copyToClipboard(outreachResult.alumni_referral_dm, 'alumni_dm')}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-xs flex items-center gap-1 active:scale-95"
                      >
                        {copiedKey === 'alumni_dm' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                      {outreachResult.alumni_referral_dm}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-5 pt-3 border-t border-slate-100 block">
                    Ideal for: BIT Mesra / College seniors at target companies.
                  </span>
                </div>

                {/* 3. Founder / CTO Pitch */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-purple-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-purple-700 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200/60">
                        3. Early-Stage Founder Pitch
                      </span>
                      <button
                        onClick={() => copyToClipboard(outreachResult.founder_dm, 'founder_dm')}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 transition-colors text-xs flex items-center gap-1 active:scale-95"
                      >
                        {copiedKey === 'founder_dm' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                      {outreachResult.founder_dm}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-5 pt-3 border-t border-slate-100 block">
                    Ideal for: Seed & Series A startup founders.
                  </span>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
