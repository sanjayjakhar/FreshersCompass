import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass, Github, FileText, Code2, Linkedin,
  Briefcase, Check, X, ArrowRight
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUser, setGithubUser] = useState('');

  const isActive = (path) => location.pathname === path;

  const handleSyncGithub = (e) => {
    e.preventDefault();
    if (!githubUser.trim()) return;
    setShowGithubModal(false);
    navigate(`/codebase?user=${encodeURIComponent(githubUser.trim())}`);
  };

  return (
    <>
      <nav className="fixed w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-border/70 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-all">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="text-lg font-extrabold text-text-primary tracking-tight">
                  Freshers<span className="text-primary">Compass</span>
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden lg:flex items-center gap-1 bg-surface-muted/60 p-1 rounded-2xl border border-border/50">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/dashboard')
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Resume & ATS
                </Link>

                <Link
                  to="/codebase"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/codebase')
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Codebase RAG
                </Link>

                <Link
                  to="/linkedin"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/linkedin')
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                  }`}
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn Studio
                </Link>

                <Link
                  to="/jobs"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/jobs')
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Live Jobs
                </Link>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGithubModal(true)}
                className="flex items-center gap-1.5 bg-surface border border-border/80 hover:border-primary/40 text-text-primary px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-surface-muted hover:-translate-y-0.5 shadow-xs"
              >
                <Github className="h-3.5 w-3.5 text-text-primary" />
                <span>Connect GitHub</span>
              </button>

              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* GitHub Sync Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-up">
          <div className="bg-surface rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowGithubModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Connect GitHub Profile</h3>
                <p className="text-xs text-text-secondary">Sync your public repositories with 1 click</p>
              </div>
            </div>

            <form onSubmit={handleSyncGithub} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-primary block mb-1">
                  GitHub Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={githubUser}
                    onChange={(e) => setGithubUser(e.target.value)}
                    placeholder="sanjayjakhar"
                    className="w-full pl-24 pr-4 py-2 bg-surface-muted rounded-xl border border-border text-sm text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                    autoFocus
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGithubModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!githubUser.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-surface text-xs font-semibold transition-all shadow-sm shadow-primary/20"
                >
                  <span>Sync & Browse Repos</span>
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
