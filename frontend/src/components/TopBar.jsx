import { useState, useEffect } from 'react';
import { Search, Bell, Menu, Github, Sparkles, X, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchProfileFromDB, updateProfileInDB, fetchLatestResume } from '../services/api';

export default function TopBar({ setMobileOpen }) {
  const navigate = useNavigate();
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUser, setGithubUser] = useState('');
  const [connectedUser, setConnectedUser] = useState('');
  const [resumeDetectedUser, setResumeDetectedUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync across MongoDB and custom events
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [profile, resume] = await Promise.all([
          fetchProfileFromDB(),
          fetchLatestResume(),
        ]);
        if (profile?.github_username) {
          setConnectedUser(profile.github_username);
          setGithubUser(profile.github_username);
        }
        if (resume?.github_username) {
          setResumeDetectedUser(resume.github_username.replace(/^@/, '').trim());
        }
      } catch (e) {
        console.error('Error fetching TopBar profile from MongoDB:', e);
      }
    };
    loadProfileData();

    const handleSync = (e) => {
      const u = e?.detail !== undefined ? e.detail : '';
      setConnectedUser(u);
      setGithubUser(u);
    };

    const handleOpenModal = () => {
      setGithubUser(connectedUser || resumeDetectedUser || '');
      setShowGithubModal(true);
    };

    window.addEventListener('freshercompass_profile_updated', handleSync);
    window.addEventListener('freshercompass_open_github_modal', handleOpenModal);
    return () => {
      window.removeEventListener('freshercompass_profile_updated', handleSync);
      window.removeEventListener('freshercompass_open_github_modal', handleOpenModal);
    };
  }, [connectedUser, resumeDetectedUser]);

  const handleSyncGithub = async (e) => {
    if (e) e.preventDefault();
    const uname = githubUser.trim().replace(/^@/, '');
    if (!uname) return;
    await updateProfileInDB({ github_username: uname });
    setConnectedUser(uname);
    setGithubUser(uname);
    window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: uname }));
    setShowGithubModal(false);
    navigate(`/codebase?user=${encodeURIComponent(uname)}`);
  };

  const handleDisconnect = async () => {
    await updateProfileInDB({ github_username: '' });
    setConnectedUser('');
    setGithubUser('');
    window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: '' }));
    setShowGithubModal(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (q.includes('resume') || q.includes('ats')) navigate('/resume');
      else if (q.includes('twin') || q.includes('readiness')) navigate('/career-twin');
      else if (q.includes('git') || q.includes('code') || q.includes('repo')) navigate('/codebase');
      else if (q.includes('interview')) navigate('/interview');
      else if (q.includes('job')) navigate('/jobs');
      else if (q.includes('roadmap') || q.includes('skill')) navigate('/roadmap');
      else if (q.includes('application') || q.includes('track')) navigate('/applications');
      else if (q.includes('portfolio')) navigate('/portfolio');
      else navigate(`/codebase?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        {/* Left Side: Hamburger (Mobile) + Search Bar */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation sidebar"
            className="lg:hidden p-2 rounded-lg text-text-body hover:bg-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="relative w-full max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              aria-label="Global search across features and repos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search features, repos, or ask AI (Press Enter)..."
              className="w-full pl-9 pr-4 py-2 bg-surface text-text-dark text-xs rounded-xl border border-border focus:outline-none focus:border-primary transition-all placeholder:text-text-muted min-h-[40px]"
            />
          </div>
        </div>

        {/* Right Side: GitHub Sync Pill + Notifications + Profile Avatar */}
        <div className="flex items-center gap-3">
          {/* GitHub Sync Button */}
          <button
            onClick={() => {
              setGithubUser(connectedUser || resumeDetectedUser || '');
              setShowGithubModal(true);
            }}
            aria-label={connectedUser ? `Connected as @${connectedUser}` : 'Connect GitHub profile'}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[44px] ${
              connectedUser
                ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10'
                : 'bg-surface border-border hover:border-primary/40 text-text-body hover:text-text-dark'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectedUser ? 'bg-success animate-pulse' : 'bg-text-muted'
              }`}
            />
            <Github className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline font-mono">
              {connectedUser ? `@${connectedUser}` : 'Connect GitHub'}
            </span>
          </button>

          {/* Notification Bell */}
          <button
            className="relative p-2 rounded-xl text-text-body hover:text-primary hover:bg-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {connectedUser ? connectedUser.slice(0, 2).toUpperCase() : 'FC'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-text-dark leading-tight">
                {connectedUser ? `@${connectedUser}` : 'Student Candidate'}
              </p>
              <p className="text-[10px] text-text-muted">Early Career</p>
            </div>
          </div>
        </div>
      </header>

      {/* GitHub Sync Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-card border border-border p-6 max-w-md w-full shadow-lg relative">
            <button
              onClick={() => setShowGithubModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-dark p-1 rounded-lg hover:bg-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-dark text-base">GitHub Integration</h3>
                <p className="text-xs text-text-body">Sync repositories for Codebase RAG and Career Twin</p>
              </div>
            </div>

            {/* Currently Connected Info */}
            {connectedUser && (
              <div className="mb-4 p-3 bg-white border border-success/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  <div className="text-xs">
                    <span className="text-text-body font-semibold">Active: </span>
                    <span className="font-mono font-bold text-primary">@{connectedUser}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 text-[11px] font-bold text-danger hover:text-danger/80 bg-danger/5 px-2.5 py-1 rounded-lg transition-colors border border-danger/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Disconnect
                </button>
              </div>
            )}

            {/* Auto-detected from Resume Banner */}
            {resumeDetectedUser && resumeDetectedUser !== connectedUser && (
              <div className="mb-4 p-3 bg-white border border-primary/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <div className="text-xs">
                    <span className="text-text-body font-semibold">Detected in resume: </span>
                    <span className="font-mono font-bold text-primary">@{resumeDetectedUser}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setGithubUser(resumeDetectedUser);
                    await updateProfileInDB({ github_username: resumeDetectedUser });
                    setConnectedUser(resumeDetectedUser);
                    window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: resumeDetectedUser }));
                    setShowGithubModal(false);
                    navigate(`/codebase?user=${encodeURIComponent(resumeDetectedUser)}`);
                  }}
                  className="text-[11px] font-bold text-white bg-primary hover:bg-primary-dark px-2.5 py-1 rounded-lg transition-colors"
                >
                  Use This
                </button>
              </div>
            )}

            <form onSubmit={handleSyncGithub} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-dark block mb-1">
                  GitHub Username or Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={githubUser}
                    onChange={(e) => setGithubUser(e.target.value)}
                    placeholder="your-handle"
                    className="w-full pl-24 pr-4 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  Enter your handle manually or sync automatically via Resume upload.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowGithubModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-text-body hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!githubUser.trim()}
                  className="btn-primary text-xs py-2 px-4"
                >
                  <span>Save & Sync Repos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
