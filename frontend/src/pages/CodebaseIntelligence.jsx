import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Github, GitBranch, Star, GitFork, AlertCircle, CheckCircle2,
  Code2, Send, Bot, User, Sparkles, Copy, Check, FileCode,
  ShieldCheck, BookOpen, Layers, Terminal, RefreshCw, ExternalLink,
  ChevronRight, ArrowRight, CornerDownLeft, FileText, Download, Rocket,
  Trash2, Info
} from 'lucide-react';
import api, { fetchProfileFromDB, updateProfileInDB } from '../services/api';

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
          <div key={index} className="space-y-2.5">
            {paragraphs.map((para, pIdx) => {
              // Blockquotes (e.g. spoken interview scripts)
              if (para.trim().startsWith('>')) {
                const quoteText = para.replace(/^>\s*/gm, '');
                return (
                  <div
                    key={pIdx}
                    className="my-2.5 p-3.5 rounded-card bg-primary-subtle/40 border-l-4 border-primary text-text-dark font-medium text-sm leading-relaxed"
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderInline(quoteText) }} />
                  </div>
                );
              }

              // Bullet lists
              if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                const items = para.trim().split('\n');
                return (
                  <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1 text-text-dark">
                    {items.map((item, iIdx) => (
                      <li key={iIdx} dangerouslySetInnerHTML={{ __html: renderInline(item.replace(/^[-*]\s+/, '')) }} />
                    ))}
                  </ul>
                );
              }

              // H3 / Major headers
              if (para.trim().startsWith('### ')) {
                return (
                  <h4 key={pIdx} className="font-bold text-primary text-base mt-3 mb-1">
                    {para.replace('### ', '')}
                  </h4>
                );
              }

              // H4 / Sub-headers
              if (para.trim().startsWith('#### ')) {
                return (
                  <h5 key={pIdx} className="font-bold text-text-dark text-sm mt-2 mb-1">
                    {para.replace('#### ', '')}
                  </h5>
                );
              }

              // Regular paragraph
              return (
                <p
                  key={pIdx}
                  className="text-text-dark leading-relaxed"
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
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-dark">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface border border-border px-1.5 py-0.5 rounded text-primary font-mono text-xs">$1</code>');
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
    {
      icon: "🎙️",
      title: "How to explain in interview?",
      desc: "3-line direct spoken answer",
      query: "How can I explain this project simply in an interview? Give me a short, natural 3-sentence spoken answer that I can say directly to the interviewer."
    },
    {
      icon: "⚙️",
      title: "Key functions & files",
      desc: "Top functions in 3 simple bullets",
      query: "What are the main functions and files in this project? Explain in 3 simple bullet points."
    },
    {
      icon: "🤖",
      title: "AI models & APIs used",
      desc: "Direct list of models & APIs",
      query: "Which AI models and APIs are used in this project? Give a simple direct list with what each one does."
    },
    {
      icon: "🚀",
      title: "Core features",
      desc: "3-4 main features in simple words",
      query: "What are the top 3-4 features of this project in simple words?"
    },
    {
      icon: "🔒",
      title: "Auth & Database",
      desc: "How login & data works simply",
      query: "How does authentication and the database work in this project in simple words?"
    },
    {
      icon: "🛠️",
      title: "How to run locally?",
      desc: "Step-by-step simple commands",
      query: "How do I run and test this project locally? Give simple step-by-step commands."
    },
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
  const isFetchingReposRef = useRef(false);
  const currentLoadedUserRef = useRef('');

  const fetchUserRepos = async (usernameToFetch, shouldBroadcast = false) => {
    const uname = (usernameToFetch || syncUser).trim().replace(/^@/, '');
    if (!uname) return;

    if (isFetchingReposRef.current) return;
    isFetchingReposRef.current = true;
    setSyncLoading(true);

    try {
      if (shouldBroadcast) {
        try {
          await updateProfileInDB({ github_username: uname });
          window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: uname }));
        } catch (e) {
          console.error("Error updating profile in DB:", e);
        }
      }

      const res = await api.get(`/github/user/${encodeURIComponent(uname)}/repos`, {
        timeout: 10000,
      });
      setSyncedProfile(res.data?.data?.profile || null);
      setSyncedRepos(res.data?.data?.repos || []);
      currentLoadedUserRef.current = uname;
    } catch (err) {
      console.error("Error fetching user repos:", err);
    } finally {
      setSyncLoading(false);
      isFetchingReposRef.current = false;
    }
  };

  const handleGenerateProjectReadme = async () => {
    const repoTarget = repoInput.trim() || analysisData?.metadata?.full_name;
    if (!repoTarget) return;

    setGeneratingProjectReadme(true);
    try {
      const res = await api.post('/github/project-readme', {
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
      const res = await api.post('/github/profile-readme', {
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
    const initUser = async () => {
      const params = new URLSearchParams(location.search);
      let userParam = params.get('user');
      if (!userParam) {
        const prof = await fetchProfileFromDB();
        userParam = prof?.github_username || '';
      }
      if (userParam) {
        setSyncUser(userParam);
        fetchUserRepos(userParam, false);
      }
    };
    initUser();
  }, [location.search]);

  // Listen to profile change events from Navbar, TopBar or Dashboard
  useEffect(() => {
    const handleSync = (e) => {
      const u = (e?.detail !== undefined ? e.detail : '').trim().replace(/^@/, '');
      setSyncUser(u);
      if (u) {
        if (currentLoadedUserRef.current !== u) {
          fetchUserRepos(u, false);
        }
      } else {
        currentLoadedUserRef.current = '';
        setSyncedProfile(null);
        setSyncedRepos([]);
      }
    };
    window.addEventListener('freshercompass_profile_updated', handleSync);
    return () => window.removeEventListener('freshercompass_profile_updated', handleSync);
  }, []);

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
      const res = await api.post('/github/analyze', {
        repo_url: targetUrl
      });

      const data = res.data.data;
      setAnalysisData(data);
      setRepoInput(targetUrl);

      // Initialize chat with warm introductory greeting
      setMessages([
        {
          role: 'assistant',
          content: `### Welcome to Codebase Intelligence for **${data.metadata.name}**!\n\nI have indexed **${data.indexed_chunks_count} code chunks** across **${data.total_files_count} files** from \`${data.metadata.full_name}\`.\n\nYou can ask me **anything** about this codebase and get instant, direct answers grounded in actual code:\n- 🎙️ **How to explain this project in an interview** (elevator pitch & key challenges)\n- ⚙️ **Key functions, modules, and architecture flow**\n- 🤖 **AI models, vector search, embeddings, or external APIs**\n- 🚀 **Core features, capabilities, and dependencies**\n- 🛠️ **How to run, test, and debug locally**\n\nClick any suggested question or ask your own question below!`,
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

      const res = await api.post('/github/chat', {
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

  const handleClearChat = () => {
    if (analysisData) {
      setMessages([
        {
          role: 'assistant',
          content: `### Codebase AI Ready for **${analysisData.metadata.name}**\n\nAsk me **anything** about this codebase (how to explain in an interview, key functions, AI models, or features) to get simple, direct answers grounded in actual code.`,
          citations: []
        }
      ]);
    } else {
      setMessages([]);
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Module Header Title & Value Prop */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20 mb-3 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Vector Codebase Intelligence & RAG
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Codebase & GitHub Intelligence
          </h1>
          <p className="mt-2 text-sm sm:text-base text-text-body leading-relaxed">
            Connect repositories, chat with vector-grounded AI for interview prep, inspect code health metrics, and generate production documentation.
          </p>
        </div>

        {/* Ingestion & Repository Bar */}
        <div className="bg-surface rounded-card border border-border p-4 sm:p-5 mb-8 shadow-2xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-grow">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="Enter GitHub URL or owner/repo (e.g. sanjayjakhar/FreshersCompass)"
                className="w-full pl-12 pr-4 py-3 bg-white rounded-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-dark text-sm font-mono placeholder:font-sans transition-all"
              />
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !repoInput.trim()}
              className="btn-accent px-6 py-3 font-semibold text-xs tracking-wide shrink-0 disabled:opacity-50 cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-border text-xs text-text-body">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-text-muted">Try sample:</span>
              {sampleRepos.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRepoInput(s.url);
                    handleAnalyze(s.url);
                  }}
                  disabled={loading}
                  className="px-3 py-1 rounded-card bg-white hover:bg-primary-subtle hover:text-primary border border-border text-text-dark transition-colors text-[11px] font-medium cursor-pointer"
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
                className="px-3 py-1.5 rounded-card bg-white border border-border text-xs font-mono w-36 focus:outline-none focus:border-primary text-text-dark"
                onKeyDown={(e) => e.key === 'Enter' && !syncLoading && fetchUserRepos(syncUser, true)}
              />
              <button
                onClick={() => fetchUserRepos(syncUser, true)}
                disabled={syncLoading || !syncUser.trim()}
                className="btn-primary px-3.5 py-1.5 rounded-card text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {syncLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                <span>{syncLoading ? 'Syncing...' : 'Sync Repos'}</span>
              </button>
            </div>
          </div>

          {/* Quickstart 1-Click Card if no repo analyzed yet */}
          {!analysisData && !loading && (
            <div className="mt-4 p-4 rounded-card bg-white border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-card bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-dark flex items-center gap-2">
                    Active Codebase: <span className="text-primary font-mono font-semibold">sanjayjakhar/FreshersCompass</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-subtle text-secondary font-bold">Fast Local Index</span>
                  </h4>
                  <p className="text-xs text-text-body mt-0.5">
                    Explore RAG vector chat, code health audit, recruiter resume pitch bullets, and automated README generators.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRepoInput('sanjayjakhar/FreshersCompass');
                  handleAnalyze('sanjayjakhar/FreshersCompass');
                }}
                className="btn-primary px-4 py-2.5 rounded-card text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Rocket className="h-4 w-4" />
                <span>1-Click Analyze</span>
              </button>
            </div>
          )}

          {/* Synced User Repositories Showcase */}
          {syncedProfile && syncedRepos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={syncedProfile.avatar_url}
                    alt={syncedProfile.login}
                    className="w-7 h-7 rounded-full border border-border"
                  />
                  <span className="text-xs font-bold text-text-dark">
                    {syncedProfile.name || syncedProfile.login}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    ({syncedRepos.length} public repos connected)
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-medium">Click any repo to switch & analyze:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {syncedRepos.map((r, idx) => {
                  const isSelected = analysisData?.metadata?.full_name?.toLowerCase() === r.full_name.toLowerCase();
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setRepoInput(r.full_name);
                        handleAnalyze(r.full_name);
                      }}
                      className={`p-3.5 rounded-card transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-2xs ${
                        isSelected
                          ? 'bg-white border-2 border-primary shadow-xs'
                          : 'bg-white border border-border hover:border-primary/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className={`text-xs font-bold truncate transition-colors ${isSelected ? 'text-primary' : 'text-text-dark group-hover:text-primary'}`} title={r.name}>
                            {r.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-body font-mono shrink-0">
                            {r.language || 'Code'}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-body line-clamp-2 leading-relaxed">
                          {r.description || 'No description provided'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border text-[10px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-warning fill-warning/20" /> {r.stars}
                        </span>
                        {isSelected ? (
                          <span className="text-secondary font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3 text-secondary" /> Active Repo
                          </span>
                        ) : (
                          <span className="text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                            Analyze <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3.5 rounded-card bg-danger-subtle border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Loading Progress Skeleton */}
        {loading && (
          <div className="bg-surface rounded-card border border-border p-10 text-center animate-pulse shadow-2xs mb-8">
            <div className="w-12 h-12 rounded-card bg-primary-subtle flex items-center justify-center mx-auto mb-4 text-primary">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Ingesting and Vectorizing Codebase</h3>
            <p className="text-sm text-text-body max-w-md mx-auto">
              Extracting file trees, computing code health metrics, generating vector embeddings, and priming Gemini for RAG queries...
            </p>
          </div>
        )}

        {/* Results Container with Clear Feature Navigation */}
        {analysisData && !loading && (
          <div className="space-y-6 animate-fade-up">

            {/* Feature Tabs Navigation Bar */}
            <div className="bg-surface rounded-card border border-border p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-card text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-white text-primary border border-border shadow-xs font-bold'
                      : 'text-text-body hover:text-primary hover:bg-white/60'
                  }`}
                >
                  <Bot className="h-4 w-4 text-primary" />
                  <span>Codebase AI Chat</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold tracking-wide">PRIMARY</span>
                </button>
                <button
                  onClick={() => setActiveTab('health')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-card text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'health'
                      ? 'bg-white text-primary border border-border shadow-xs font-bold'
                      : 'text-text-body hover:text-primary hover:bg-white/60'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  <span>Code Health & Audit</span>
                </button>
                <button
                  onClick={() => setActiveTab('pitch')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-card text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'pitch'
                      ? 'bg-white text-primary border border-border shadow-xs font-bold'
                      : 'text-text-body hover:text-primary hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-warning" />
                  <span>Recruiter Pitch (XYZ)</span>
                </button>
                <button
                  onClick={() => setActiveTab('readme')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-card text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'readme'
                      ? 'bg-white text-primary border border-border shadow-xs font-bold'
                      : 'text-text-body hover:text-primary hover:bg-white/60'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>README Studio</span>
                </button>
              </div>

              {/* Quick Health Summary Pill */}
              <div className="flex items-center gap-2 text-xs text-text-body px-3 py-1.5 rounded-card bg-white border border-border self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-mono text-text-dark font-medium">{analysisData.metadata.name}</span>
                <span className="text-text-muted">|</span>
                <span className="font-semibold text-secondary">{analysisData.health.overall_score}/100 Readiness</span>
              </div>
            </div>

            {/* TAB 1: CODEBASE AI CHAT (SPLIT-SCREEN LAYOUT) */}
            {activeTab === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT PANEL (Col 4 of 12): Repository Navigator & Suggested Topics */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* 1. Active Repository Info Card */}
                  <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-text-dark text-sm truncate flex items-center gap-1.5">
                        <Github className="h-4 w-4 text-text-muted" />
                        <span className="truncate">{analysisData.metadata.name}</span>
                      </h3>
                      <a
                        href={analysisData.metadata.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs inline-flex items-center gap-0.5 shrink-0"
                      >
                        GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-text-body text-xs mt-1.5 line-clamp-2">
                      {analysisData.metadata.description || 'Repository connected for code intelligence.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border text-xs">
                      <div className="flex items-center gap-1.5 text-text-body">
                        <Star className="h-3.5 w-3.5 text-warning fill-warning/20" />
                        <span className="font-medium text-text-dark">{analysisData.metadata.stars}</span> stars
                      </div>
                      <div className="flex items-center gap-1.5 text-text-body">
                        <GitFork className="h-3.5 w-3.5 text-text-muted" />
                        <span className="font-medium text-text-dark">{analysisData.metadata.forks}</span> forks
                      </div>
                      <div className="flex items-center gap-1.5 text-text-body">
                        <GitBranch className="h-3.5 w-3.5 text-text-muted" />
                        <span className="font-mono text-text-dark text-[11px] truncate">{analysisData.metadata.default_branch}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-body">
                        <FileCode className="h-3.5 w-3.5 text-text-muted" />
                        <span className="font-medium text-text-dark">{analysisData.total_files_count}</span> files
                      </div>
                    </div>
                  </div>

                  {/* 2. One-Click Suggested Spoken Questions */}
                  <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Suggested Questions
                      </h3>
                      <span className="text-[10px] text-text-muted">One-click ask</span>
                    </div>

                    <div className="space-y-2">
                      {quickPrompts.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q.query)}
                          disabled={chatLoading}
                          className="w-full text-left p-2.5 rounded-card bg-white border border-border hover:border-primary/50 hover:bg-primary-subtle/20 transition-all flex items-start gap-2.5 group cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          <span className="text-base shrink-0 leading-none mt-0.5">{q.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-text-dark group-hover:text-primary transition-colors truncate">
                              {q.title}
                            </div>
                            <div className="text-[11px] text-text-body truncate mt-0.5">
                              {q.desc}
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Sample Code Files Analyzed */}
                  <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
                    <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-primary" /> Key Code Files
                    </h3>
                    <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                      {analysisData.files_sample.slice(0, 8).map((f, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSendMessage(`Explain the purpose and key functions of file ${f}`)}
                          className="text-[11.5px] font-mono text-text-body truncate p-1.5 rounded-card hover:bg-white hover:text-primary hover:border hover:border-border cursor-pointer transition-colors flex items-center gap-1.5"
                          title={f}
                        >
                          <FileCode className="h-3 w-3 shrink-0 text-text-muted" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* RIGHT PANEL (Col 8 of 12): Conversational Codebase Chat */}
                <div className="lg:col-span-8 bg-surface rounded-card border border-border flex flex-col h-[700px] overflow-hidden shadow-2xs">
                  
                  {/* Chat Top Status Bar */}
                  <div className="px-5 py-3.5 bg-white border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                      <span className="text-xs font-bold text-text-dark">
                        Codebase AI Assistant
                      </span>
                      <span className="text-[11px] text-text-muted">
                        • Grounded in <strong className="text-primary font-mono">{analysisData.metadata.name}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-dark font-mono font-medium">
                        {analysisData.indexed_chunks_count} chunks indexed
                      </span>
                      <button
                        onClick={handleClearChat}
                        className="text-text-muted hover:text-danger text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Clear conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                    </div>
                  </div>

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
                          <div className="w-8 h-8 rounded-card bg-white border border-border flex items-center justify-center text-primary shrink-0 mt-1 shadow-2xs">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`text-sm ${
                            m.role === 'user'
                              ? 'max-w-[80%] rounded-card rounded-tr-none p-3.5 bg-primary text-white shadow-2xs leading-relaxed'
                              : 'max-w-[88%] rounded-card rounded-tl-none p-4 sm:p-5 bg-white border border-border text-text-dark shadow-2xs leading-relaxed'
                          }`}
                        >
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <div>
                              <FormattedMessage text={m.content} />

                              {/* Citations Box */}
                              {m.citations && m.citations.length > 0 && (
                                <div className="mt-3.5 pt-3 border-t border-border">
                                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                    <FileCode className="h-3 w-3 text-secondary" /> Grounded Source Citations
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.citations.map((cite, cIdx) => (
                                      <span
                                        key={cIdx}
                                        title={`Score: ${cite.score}\nPreview: ${cite.snippet}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-mono text-text-dark hover:border-primary/40 hover:text-primary transition-colors"
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
                          <div className="w-8 h-8 rounded-card bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex gap-3 justify-start animate-fade-up">
                        <div className="w-8 h-8 rounded-card bg-white border border-border flex items-center justify-center text-primary shrink-0 mt-1 shadow-2xs">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-white border border-border rounded-card rounded-tl-none p-4 text-xs text-text-body flex items-center gap-2 shadow-2xs">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Searching codebase vector embeddings & synthesizing direct answer...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Ask Suggestion Chips Bar */}
                  <div className="px-4 py-2.5 bg-surface border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold text-text-muted shrink-0 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Quick Ask:
                    </span>
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q.query)}
                        disabled={chatLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border text-xs font-medium text-text-dark hover:text-primary hover:border-primary/40 shadow-2xs whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <span>{q.icon}</span>
                        <span>{q.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-4 bg-white border-t border-border">
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
                        placeholder="Ask anything about this repo (e.g. 'How to explain in interview?', 'Functions & APIs', 'AI models')..."
                        disabled={chatLoading}
                        className="flex-grow px-4 py-2.5 bg-surface/50 rounded-card border border-border text-text-dark text-sm placeholder:text-text-muted focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !inputQuery.trim()}
                        className="btn-primary p-2.5 rounded-card shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: CODE HEALTH & AUDIT */}
            {activeTab === 'health' && (
              <div className="space-y-6 animate-fade-up">
                
                {/* Scorecards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Overall Code Health */}
                  <div className="bg-surface rounded-card border border-border p-6 text-center shadow-2xs flex flex-col items-center justify-center">
                    <ScoreRing
                      score={analysisData.health.overall_score}
                      size={120}
                      strokeWidth={10}
                    />
                    <h3 className="font-bold text-text-dark text-base mt-3">Code Health</h3>
                    <p className="text-xs text-text-body mt-0.5">Recruiter Readiness Score</p>
                  </div>

                  {/* Documentation */}
                  <div className="bg-surface rounded-card border border-border p-6 text-center shadow-2xs flex flex-col items-center justify-center">
                    <ScoreRing
                      score={analysisData.health.doc_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-dark text-sm mt-3 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" /> Documentation
                    </h3>
                    <p className="text-xs text-text-body mt-0.5">README & Guides</p>
                  </div>

                  {/* Architecture */}
                  <div className="bg-surface rounded-card border border-border p-6 text-center shadow-2xs flex flex-col items-center justify-center">
                    <ScoreRing
                      score={analysisData.health.arch_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-dark text-sm mt-3 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-secondary" /> Architecture
                    </h3>
                    <p className="text-xs text-text-body mt-0.5">Modularity & Structure</p>
                  </div>

                  {/* Testing & Practices */}
                  <div className="bg-surface rounded-card border border-border p-6 text-center shadow-2xs flex flex-col items-center justify-center">
                    <ScoreRing
                      score={analysisData.health.test_score}
                      size={100}
                      strokeWidth={8}
                    />
                    <h3 className="font-bold text-text-dark text-sm mt-3 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Best Practices
                    </h3>
                    <p className="text-xs text-text-body mt-0.5">Testing, CI/CD & Linting</p>
                  </div>
                </div>

                {/* Tech Stack & Detailed Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Tech Stack Badge Panel */}
                  <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
                    <h3 className="text-sm font-bold text-text-dark mb-3.5 flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-primary" /> Detected Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.health.tech_stack.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-card bg-white text-primary border border-border text-xs font-semibold shadow-2xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
                    <h3 className="text-sm font-bold text-text-dark mb-3.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" /> Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {analysisData.health.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-text-body">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
                    <h3 className="text-sm font-bold text-text-dark mb-3.5 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" /> Actionable Improvements
                    </h3>
                    <ul className="space-y-2">
                      {analysisData.health.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-text-body">
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
              <div className="bg-surface rounded-card border border-border p-6 sm:p-7 shadow-2xs space-y-6 animate-fade-up">
                <div>
                  <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Recruiter Pitch & Resume Bullets
                  </h3>
                  <p className="text-sm text-text-body mt-1">
                    AI-generated bullet points formatted according to Google's XYZ formula (<em>Accomplished [X] as measured by [Y], by doing [Z]</em>). Ready to paste directly into your resume!
                  </p>
                </div>

                <div className="space-y-3.5">
                  {analysisData.recruiter_pitch.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-card bg-white border border-border flex items-start justify-between gap-4 group hover:border-primary/40 transition-all shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary-subtle text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-text-dark leading-relaxed">{bullet}</p>
                      </div>

                      <button
                        onClick={() => handleCopyPitch(bullet, idx)}
                        className="px-3 py-1.5 rounded-card bg-surface border border-border hover:border-primary/50 text-text-dark hover:text-primary transition-all text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
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
                <div className="p-5 rounded-card bg-white border border-border">
                  <h4 className="font-bold text-primary text-sm flex items-center gap-2 mb-2">
                    <Terminal className="h-4 w-4 text-primary" /> Technical Interview Talking Points
                  </h4>
                  <p className="text-xs text-text-body leading-relaxed mb-3">
                    When discussing this project with interviewers, emphasize the architectural choices:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text-body">
                    <div className="p-3.5 rounded-card bg-surface border border-border">
                      <strong className="text-text-dark block mb-1">Architecture & Separation:</strong>
                      Highlight how modular boundaries and clean code separation were maintained throughout the service layers.
                    </div>
                    <div className="p-3.5 rounded-card bg-surface border border-border">
                      <strong className="text-text-dark block mb-1">Stack Selection:</strong>
                      Explain the reasoning behind utilizing {analysisData.health.tech_stack.slice(0, 3).join(', ')} for scalable performance.
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: README STUDIO */}
            {activeTab === 'readme' && (
              <div className="space-y-6 animate-fade-up">
                
                {/* 1. Production Project README Generator */}
                <div className="bg-surface rounded-card border border-border p-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileCode className="h-5 w-5 text-primary" />
                        <h3 className="text-base font-bold text-text-dark">
                          Production Project README Generator
                        </h3>
                      </div>
                      <p className="text-xs text-text-body">
                        Transform <strong>{analysisData.metadata.name}</strong> into an open-source standard README with badges, architecture overview, and quickstart guide.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateProjectReadme}
                      disabled={generatingProjectReadme}
                      className="btn-primary px-4 py-2.5 rounded-card text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
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
                            className="px-3 py-1.5 rounded-card bg-white border border-border text-text-dark hover:text-primary transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
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
                            className="btn-primary px-3 py-1.5 rounded-card text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download .md
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 rounded-card bg-[#1E1E1E] text-neutral-200 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-border">
                        <code>{projectReadmeMarkdown}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* 2. GitHub Profile README Generator */}
                <div className="bg-surface rounded-card border border-border p-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Github className="h-5 w-5 text-primary" />
                        <h3 className="text-base font-bold text-text-dark">
                          GitHub Profile README Generator (<code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono border border-border">{syncedProfile?.login || 'user'}</code>)
                        </h3>
                      </div>
                      <p className="text-xs text-text-body">
                        Generates a high-converting profile showcase with live stats widgets, tech stack badges, and featured repositories.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateProfileReadme}
                      disabled={generatingProfileReadme}
                      className="btn-primary px-4 py-2.5 rounded-card text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
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
                            className="px-3 py-1.5 rounded-card bg-white border border-border text-text-dark hover:text-primary transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
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
                            className="btn-primary px-3 py-1.5 rounded-card text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download README.md
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 rounded-card bg-[#1E1E1E] text-neutral-200 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-border">
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
