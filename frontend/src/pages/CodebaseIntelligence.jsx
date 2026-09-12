import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Github, GitBranch, Star, GitFork, AlertCircle, CheckCircle2,
  Code2, Send, Bot, User, Sparkles, Copy, Check, FileCode,
  ShieldCheck, BookOpen, Layers, Terminal, RefreshCw, ExternalLink,
  ChevronRight, ArrowRight, CornerDownLeft, FileText, Download, Rocket
} from 'lucide-react';

// ---------- Circular Animated Health Score Ring ----------
function ScoreRing({ score, label, sublabel, size = 110, strokeWidth = 8, colorOverride = null }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animatedScore / 100);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score || 0), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s) => {
    if (colorOverride) return colorOverride;
    if (s >= 80) return { stroke: '#0F6E56', text: 'text-secondary', bg: 'bg-secondary/10' };
    if (s >= 65) return { stroke: '#185FA5', text: 'text-primary', bg: 'bg-primary/10' };
    if (s >= 50) return { stroke: '#EF9F27', text: 'text-warning', bg: 'bg-warning/10' };
    return { stroke: '#E24B4A', text: 'text-danger', bg: 'bg-danger/10' };
  };

  const col = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#E5E4DF" strokeWidth={strokeWidth}
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
          <span className={`text-2xl font-bold ${col.text} animate-count-up`}>
            {animatedScore}
          </span>
          <span className="text-[10px] text-text-muted font-medium">/ 100</span>
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-text-primary mt-2">{label}</span>}
      {sublabel && <span className="text-[11px] text-text-muted">{sublabel}</span>}
    </div>
  );
}

// ---------- Lightweight Markdown & Code Formatter ----------
function FormattedMessage({ text }) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0].includes(' ') || lines[0].length > 15 ? '' : lines[0].trim();
          const code = language ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="rounded-xl overflow-hidden border border-border bg-[#1E1E1E] text-neutral-200 my-3 text-xs shadow-inner">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#2D2D2D] border-b border-[#3E3E3E] text-neutral-400 font-mono text-[11px]">
                <span>{language || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto font-mono text-[11.5px] leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Parse paragraphs, bold, lists, and inline code
        const paragraphs = part.split('\n\n');
        return (
          <div key={index} className="space-y-2">
            {paragraphs.map((para, pIdx) => {
              if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                const items = para.trim().split('\n');
                return (
                  <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1">
                    {items.map((item, iIdx) => (
                      <li key={iIdx} dangerouslySetInnerHTML={{ __html: renderInline(item.replace(/^[-*]\s+/, '')) }} />
                    ))}
                  </ul>
                );
              }
              if (para.trim().startsWith('### ')) {
                return (
                  <h4 key={pIdx} className="font-bold text-text-primary text-base mt-3 mb-1">
                    {para.replace('### ', '')}
                  </h4>
                );
              }
              return (
                <p
                  key={pIdx}
                  className="text-text-secondary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderInline(para) }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(str) {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface-muted border border-border px-1.5 py-0.5 rounded text-primary-dark font-mono text-xs">$1</code>');
}

export default function CodebaseIntelligence() {
  const [repoInput, setRepoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'health' | 'pitch' | 'readme'
  const [error, setError] = useState(null);

  // README Studio state
  const [projectReadmeMarkdown, setProjectReadmeMarkdown] = useState('');
  const [generatingProjectReadme, setGeneratingProjectReadme] = useState(false);
  const [profileReadmeMarkdown, setProfileReadmeMarkdown] = useState('');
  const [generatingProfileReadme, setGeneratingProfileReadme] = useState(false);
  const [readmeCopiedKey, setReadmeCopiedKey] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatBottomRef = useRef(null);

  const quickPrompts = [
    "Explain the high-level architecture of this codebase",
    "How is authentication and security implemented?",
    "What are the main API endpoints and services?",
    "Suggest 3 architectural improvements for this project",
    "What technical interview questions could be asked about this repo?"
  ];

  const sampleRepos = [
    { label: "FreshersCompass (Current)", url: "sanjayjakhar/FreshersCompass" },
    { label: "FastAPI Example", url: "tiangolo/fastapi" },
    { label: "Express Starter", url: "expressjs/express" }
  ];

  // GitHub user profile sync state
  const location = useLocation();
  const [syncUser, setSyncUser] = useState('');
  const [syncedProfile, setSyncedProfile] = useState(null);
  const [syncedRepos, setSyncedRepos] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchUserRepos = async (usernameToFetch) => {
    const uname = (usernameToFetch || syncUser).trim();
    if (!uname) return;
    setSyncLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/github/user/${uname}/repos`);
      setSyncedProfile(res.data?.data?.profile || null);
      setSyncedRepos(res.data?.data?.repos || []);
    } catch (err) {
      console.error("Error fetching user repos:", err);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleGenerateProjectReadme = async () => {
    const repoTarget = repoInput.trim() || analysisData?.metadata?.full_name;
    if (!repoTarget) return;

    setGeneratingProjectReadme(true);
    try {
      const res = await axios.post('http://localhost:5000/api/github/project-readme', {
        repo_url: repoTarget
      });
      setProjectReadmeMarkdown(res.data.markdown);
    } catch (err) {
      console.error("Error generating project readme:", err);
      setError("Failed to generate project README. Ensure repository is public.");
    } finally {
      setGeneratingProjectReadme(false);
    }
  };

  const handleGenerateProfileReadme = async () => {
    const uname = syncedProfile?.login || syncUser.trim() || 'sanjayjakhar';
    setGeneratingProfileReadme(true);
    try {
      const res = await axios.post('http://localhost:5000/api/github/profile-readme', {
        username: uname,
        repos: syncedRepos.length > 0 ? syncedRepos : [{ name: 'FreshersCompass', description: 'AI Career Twin', language: 'JavaScript', stars: 12 }],
        top_skills: ['React', 'Node.js', 'FastAPI', 'Python', 'Tailwind CSS', 'Vector RAG'],
        bio: syncedProfile?.bio || 'Full-Stack Developer building intelligent tools'
      });
      setProfileReadmeMarkdown(res.data.markdown);
    } catch (err) {
      console.error("Error generating profile readme:", err);
      setError("Failed to generate profile README.");
    } finally {
      setGeneratingProfileReadme(false);
    }
  };

  const handleDownloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyReadmeText = (text, key) => {
    navigator.clipboard.writeText(text);
    setReadmeCopiedKey(key);
    setTimeout(() => setReadmeCopiedKey(null), 2000);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userParam = params.get('user');
    if (userParam) {
      setSyncUser(userParam);
      fetchUserRepos(userParam);
    }
  }, [location.search]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading, activeTab]);

  const handleAnalyze = async (urlToAnalyze = null) => {
    const targetUrl = (urlToAnalyze || repoInput).trim();
    if (!targetUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:5000/api/github/analyze', {
        repo_url: targetUrl
      });

      const data = res.data.data;
      setAnalysisData(data);
      setRepoInput(targetUrl);

      // Initialize chat with warm introductory greeting
      setMessages([
        {
          role: 'assistant',
          content: `### Welcome to Codebase Intelligence for **${data.metadata.name}**!\n\nI have indexed **${data.indexed_chunks_count} code chunks** across **${data.total_files_count} files** from \`${data.metadata.full_name}\`.\n\nYou can ask me anything about the architecture, APIs, dependencies, or request interview talking points grounded in this code.`,
          citations: []
        }
      ]);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.details ||
        err.response?.data?.message ||
        'Failed to analyze repository. Check if the repository URL is public and valid.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (queryToSend = null) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || chatLoading || !analysisData) return;

    const userMessage = { role: 'user', content: q };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputQuery('');
    setChatLoading(true);

    try {
      const history = updatedMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await axios.post('http://localhost:5000/api/github/chat', {
        repo_url: analysisData.metadata.html_url || repoInput,
        question: q,
        history
      });

      const aiResponse = res.data.data;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse.answer,
          citations: aiResponse.citations || []
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error querying codebase**: ${err.response?.data?.details || err.message || 'Service unavailable'}. Please try again.`,
          citations: []
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopyPitch = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-3 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Vector Codebase RAG & Developer Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Codebase & GitHub Intelligence
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Ingest repositories, chat with vector-grounded RAG, inspect automated code health metrics, and generate production READMEs.
          </p>
        </div>

        {/* Ingestion Search Box */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm mb-8 transition-all hover:border-blue-500/30">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-grow">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="Enter GitHub URL or owner/repo (e.g. sanjayjakhar/FreshersCompass)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 text-sm font-mono placeholder:font-sans transition-all"
              />
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !repoInput.trim()}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-blue-500/25 shrink-0 active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing Codebase...</span>
                </>
              ) : (
                <>
                  <Code2 className="h-4 w-4" />
                  <span>Analyze Repository</span>
                </>
              )}
            </button>
          </div>

          {/* Quick sample chips & Profile Sync */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-400">Try sample:</span>
              {sampleRepos.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRepoInput(s.url);
                    handleAnalyze(s.url);
                  }}
                  disabled={loading}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors text-[11px] font-medium"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick Profile Sync Trigger */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={syncUser}
                onChange={(e) => setSyncUser(e.target.value)}
                placeholder="github username"
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono w-36 focus:outline-none focus:border-blue-500 text-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && fetchUserRepos()}
              />
              <button
                onClick={() => fetchUserRepos()}
                disabled={syncLoading || !syncUser.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                {syncLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                <span>Sync Repos</span>
              </button>
            </div>
          </div>

          {/* Synced User Repositories Showcase */}
          {syncedProfile && syncedRepos.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={syncedProfile.avatar_url}
                    alt={syncedProfile.login}
                    className="w-7 h-7 rounded-full border border-slate-200"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    {syncedProfile.name || syncedProfile.login}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({syncedRepos.length} public repos)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Click any repo to inspect & chat:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                {syncedRepos.map((r, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setRepoInput(r.full_name);
                      handleAnalyze(r.full_name);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-500/40 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-2xs hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate" title={r.name}>
                          {r.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-mono shrink-0">
                          {r.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500/20" /> {r.stars}
                      </span>
                      <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
                        Inspect <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Loading Progress Skeleton */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center animate-pulse shadow-sm mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Ingesting and Vectorizing Codebase</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Extracting file trees, computing health metrics, generating vector embeddings, and priming Gemini for RAG queries...
            </p>
          </div>
        )}

        {/* Results Container */}
        {analysisData && !loading && (
          <div className="space-y-8 animate-fade-up">

            {/* Repository Info Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {analysisData.metadata.name}
                  </h2>
                  <a
                    href={analysisData.metadata.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1 text-xs"
                  >
                    View on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                  {analysisData.metadata.description}
                </p>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                    <strong className="text-slate-900">{analysisData.metadata.stars}</strong> stars
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5 text-slate-400" />
                    <strong className="text-slate-900">{analysisData.metadata.forks}</strong> forks
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-800 font-mono">{analysisData.metadata.default_branch}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCode className="h-3.5 w-3.5 text-slate-400" />
                    <strong className="text-slate-900">{analysisData.total_files_count}</strong> files analyzed
                  </span>
                </div>
              </div>

              {/* Navigation Tabs (Smooth Pill Bar) */}
              <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto shadow-2xs">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'chat'
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>RAG Chat</span>
                </button>
                <button
                  onClick={() => setActiveTab('health')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'health'
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Code Health</span>
                </button>
                <button
                  onClick={() => setActiveTab('pitch')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'pitch'
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Recruiter Pitch</span>
                </button>
                <button
                  onClick={() => setActiveTab('readme')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'readme'
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>README Studio</span>
                </button>
              </div>
            </div>

            {/* TAB 1: RAG CHAT */}
            {activeTab === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Chat Column (3 cols) */}
                <div className="lg:col-span-3 bg-surface rounded-2xl border border-border shadow-sm flex flex-col h-[650px] overflow-hidden">
                  
                  {/* Chat Message Stream */}
                  <div className="flex-grow p-5 overflow-y-auto space-y-4">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 animate-fade-up ${
                          m.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {m.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                            m.role === 'user'
                              ? 'bg-primary text-surface rounded-tr-none'
                              : 'bg-surface-muted border border-border text-text-primary rounded-tl-none'
                          }`}
                        >
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <div>
                              <FormattedMessage text={m.content} />

                              {/* Citations Box */}
                              {m.citations && m.citations.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                    <FileCode className="h-3 w-3 text-secondary" /> Grounded Source Citations
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.citations.map((cite, cIdx) => (
                                      <span
                                        key={cIdx}
                                        title={`Score: ${cite.score}\nPreview: ${cite.snippet}`}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-mono text-text-secondary hover:border-primary/50 transition-colors"
                                      >
                                        <span className="text-primary font-medium">{cite.file}</span>
                                        <span className="text-text-muted">:{cite.lines}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {m.role === 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0 mt-1">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex gap-3 justify-start animate-fade-up">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-surface-muted border border-border rounded-2xl rounded-tl-none p-4 text-xs text-text-secondary flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Searching codebase vector embeddings & synthesizing answer...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Box */}
                  <div className="p-4 border-t border-border bg-surface">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        placeholder="Ask anything about this repo (e.g. 'How does routing work?')..."
                        disabled={chatLoading}
                        className="flex-grow px-4 py-2.5 bg-surface-muted rounded-xl border border-border text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !inputQuery.trim()}
                        className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-surface p-2.5 rounded-xl transition-colors shadow-md shadow-primary/20 shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Sidebar Quick Prompts & Key Files (1 col) */}
                <div className="space-y-6">
                  {/* Quick Prompts */}
                  <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Suggested Questions
                    </h3>
                    <div className="space-y-2">
                      {quickPrompts.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          disabled={chatLoading}
                          className="w-full text-left p-2.5 rounded-xl bg-surface-muted border border-border/70 text-xs text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-between group"
                        >
                          <span className="line-clamp-2">{q}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sample Files Analyzed */}
                  <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-secondary" /> Sample Key Files
                    </h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {analysisData.files_sample.slice(0, 8).map((f, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSendMessage(`Explain the purpose and logic of file ${f}`)}
                          className="text-[11px] font-mono text-text-secondary truncate p-1.5 rounded-lg hover:bg-surface-muted cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <FileCode className="h-3 w-3 shrink-0 text-text-muted" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: CODE HEALTH */}
            {activeTab === 'health' && (
              <div className="space-y-6 animate-fade-up">
                
                {/* Scorecards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Overall Code Health */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <ScoreRing
                      score={analysisData.health.overall_score}
                      size={120}
                      strokeWidth={10}
                    />
                    <h3 className="font-bold text-text-primary text-base mt-3">Code Health</h3>
                    <p className="text-xs text-text-muted mt-0.5">Recruiter Readiness Score</p>
                  </div>

                  {/* Documentation */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <ScoreRing
                      score={analysisData.health.doc_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-primary text-sm mt-3 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" /> Documentation
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">README & Guides</p>
                  </div>

                  {/* Architecture */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <ScoreRing
                      score={analysisData.health.arch_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-primary text-sm mt-3 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-secondary" /> Architecture
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">Modularity & Structure</p>
                  </div>

                  {/* Testing & Practices */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <ScoreRing
                      score={analysisData.health.test_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-primary text-sm mt-3 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-accent" /> Best Practices
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">Testing, CI/CD & Linting</p>
                  </div>
                </div>

                {/* Tech Stack & Detailed Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Tech Stack Badge Panel */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-primary" /> Detected Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.health.tech_stack.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-primary/10 text-primary-dark border border-primary/20 text-xs font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-secondary" /> Key Strengths
                    </h3>
                    <ul className="space-y-2.5">
                      {analysisData.health.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                          <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" /> Actionable Improvements
                    </h3>
                    <ul className="space-y-2.5">
                      {analysisData.health.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: RECRUITER PITCH */}
            {activeTab === 'pitch' && (
              <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm space-y-6 animate-fade-up">
                <div>
                  <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Recruiter Pitch & Resume Bullets
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    AI-generated bullet points formatted according to Google's XYZ formula (<em>Accomplished [X] as measured by [Y], by doing [Z]</em>). Ready to paste directly into your resume or LinkedIn experience!
                  </p>
                </div>

                <div className="space-y-4">
                  {analysisData.recruiter_pitch.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-surface-muted border border-border flex items-start justify-between gap-4 group hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">{bullet}</p>
                      </div>

                      <button
                        onClick={() => handleCopyPitch(bullet, idx)}
                        className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 text-text-secondary hover:text-primary transition-all text-xs flex items-center gap-1.5 shrink-0"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-secondary" />
                            <span className="text-secondary font-medium">Copied</span>
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

                {/* Interview Talking Tips */}
                <div className="mt-8 p-6 rounded-2xl bg-secondary/5 border border-secondary/20">
                  <h4 className="font-bold text-secondary-dark text-sm flex items-center gap-2 mb-2">
                    <Terminal className="h-4 w-4" /> Technical Interview Talking Points
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed mb-3">
                    When discussing this project with interviewers, emphasize the architectural choices:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text-secondary">
                    <div className="p-3 rounded-xl bg-surface border border-secondary/15">
                      <strong className="text-text-primary block mb-1">Architecture & Separation:</strong>
                      Highlight how modular boundaries and clean code separation were maintained throughout the service layers.
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-secondary/15">
                      <strong className="text-text-primary block mb-1">Stack Selection:</strong>
                      Explain the reasoning behind utilizing {analysisData.health.tech_stack.slice(0, 3).join(', ')} for scalable performance.
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: README STUDIO */}
            {activeTab === 'readme' && (
              <div className="space-y-8 animate-fade-up">
                
                {/* 1. Production Project README Generator */}
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileCode className="h-5 w-5 text-primary" />
                        <h3 className="text-base font-bold text-text-primary">
                          Production Project README Generator
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Transform <strong>{analysisData.metadata.name}</strong> into an open-source standard README with badges, architecture overview, installation guide, and API table.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateProjectReadme}
                      disabled={generatingProjectReadme}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-surface text-xs font-semibold flex items-center gap-2 shadow-sm shrink-0 transition-all"
                    >
                      {generatingProjectReadme ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generating Markdown...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          Generate Project README
                        </>
                      )}
                    </button>
                  </div>

                  {projectReadmeMarkdown && (
                    <div className="mt-5 space-y-3 animate-fade-up">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                          Generated Markdown Preview
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyReadmeText(projectReadmeMarkdown, 'proj_readme')}
                            className="px-3 py-1.5 rounded-lg bg-surface-muted border border-border text-text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1.5"
                          >
                            {readmeCopiedKey === 'proj_readme' ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-secondary" />
                                <span className="text-secondary font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Markdown</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadFile(projectReadmeMarkdown, `${analysisData.metadata.name}-README.md`)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary-dark hover:bg-primary hover:text-surface transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download .md
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 rounded-xl bg-[#1E1E1E] text-neutral-200 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-border">
                        <code>{projectReadmeMarkdown}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* 2. GitHub Profile README Generator */}
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Github className="h-5 w-5 text-secondary" />
                        <h3 className="text-base font-bold text-text-primary">
                          GitHub Profile README Generator (<code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded font-mono">github.com/{syncedProfile?.login || 'user'}</code>)
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Generates a high-converting profile showcase with live stats widgets, tech stack badges, and featured repositories.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateProfileReadme}
                      disabled={generatingProfileReadme}
                      className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-surface text-xs font-semibold flex items-center gap-2 shadow-sm shrink-0 transition-all"
                    >
                      {generatingProfileReadme ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Crafting Profile README...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Profile README
                        </>
                      )}
                    </button>
                  </div>

                  {profileReadmeMarkdown && (
                    <div className="mt-5 space-y-3 animate-fade-up">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                          Generated Profile Markdown
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyReadmeText(profileReadmeMarkdown, 'prof_readme')}
                            className="px-3 py-1.5 rounded-lg bg-surface-muted border border-border text-text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1.5"
                          >
                            {readmeCopiedKey === 'prof_readme' ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-secondary" />
                                <span className="text-secondary font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Markdown</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadFile(profileReadmeMarkdown, `README.md`)}
                            className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary-dark hover:bg-secondary hover:text-surface transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download README.md
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 rounded-xl bg-[#1E1E1E] text-neutral-200 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-border">
                        <code>{profileReadmeMarkdown}</code>
                      </pre>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
