import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, FileText, Code2, Mic,
  Briefcase, Compass, CheckSquare, Globe, Settings,
  ChevronLeft, ChevronRight, Github, Linkedin
} from 'lucide-react';
import { fetchProfileFromDB } from '../services/api';

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const [githubUser, setGithubUser] = useState('');

  useEffect(() => {
    fetchProfileFromDB().then((p) => {
      if (p?.github_username) setGithubUser(p.github_username);
    });
    const handleSync = (e) => {
      if (e?.detail !== undefined) setGithubUser(e.detail);
    };
    window.addEventListener('freshercompass_profile_updated', handleSync);
    return () => window.removeEventListener('freshercompass_profile_updated', handleSync);
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/career-twin', label: 'AI Career Twin', icon: Sparkles, badge: 'AI' },
    { to: '/resume', label: 'Resume & ATS', icon: FileText, badge: null },
    { to: '/linkedin', label: 'LinkedIn Optimizer', icon: Linkedin, badge: 'AI' },
    { to: '/codebase', label: 'GitHub Analyzer', icon: Code2, badge: null },
    { to: '/interview', label: 'AI Interview', icon: Mic, badge: 'Live' },
    { to: '/jobs', label: 'Job Recommendations', icon: Briefcase, badge: 'New' },
    { to: '/roadmap', label: 'Skill-Gap Roadmap', icon: Compass, badge: null },
    { to: '/applications', label: 'Application Tracker', icon: CheckSquare, badge: null },
    { to: '/portfolio', label: 'Portfolio Generator', icon: Globe, badge: null },
    { to: '/settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-surface border-r border-border transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 overflow-hidden group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm shadow-primary/20 group-hover:scale-105 transition-all">
              <Compass className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-extrabold text-primary tracking-tight leading-tight">
                  Freshers<span className="text-text-dark">Compass</span>
                </span>
                <span className="text-[10px] text-text-muted font-semibold tracking-wider uppercase">
                  AI Career Engine
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-primary hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px]"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative min-h-[44px] ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-text-body hover:text-text-dark hover:bg-surface-muted'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                )}

                <Icon
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate flex-1 text-xs sm:text-sm font-medium">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      item.badge === 'AI'
                        ? 'bg-primary/15 text-primary'
                        : item.badge === 'Live'
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-accent/15 text-accent'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Connected Status Card */}
        <div className="p-3 border-t border-border">
          {!collapsed ? (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('freshercompass_open_github_modal'))}
              className="w-full text-left bg-white hover:bg-surface rounded-xl p-3 border border-border hover:border-primary/40 flex items-center justify-between transition-all group cursor-pointer shadow-2xs"
              title="Click to manage GitHub connection & sync"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-muted group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                  <Github className="h-4 w-4 text-text-body group-hover:text-primary transition-colors" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-dark truncate group-hover:text-primary transition-colors">
                    {githubUser ? `@${githubUser}` : 'Connect GitHub'}
                  </p>
                  <p className="text-[10px] text-text-muted">GitHub Sync</p>
                </div>
              </div>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  githubUser ? 'bg-success ring-4 ring-success/20' : 'bg-border'
                }`}
              />
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('freshercompass_open_github_modal'))}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-white hover:bg-surface border border-border hover:border-primary/40 min-h-[44px] min-w-[44px] cursor-pointer transition-colors"
              title={githubUser ? `@${githubUser} (Click to manage sync)` : 'Click to connect GitHub'}
            >
              <Github className="h-4 w-4 text-text-body" aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Visible on mobile screens < 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1 safe-bottom shadow-lg"
      >
        {[
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/career-twin', label: 'Twin', icon: Sparkles },
          { to: '/resume', label: 'Resume', icon: FileText },
          { to: '/codebase', label: 'Code', icon: Code2 },
          { to: '/jobs', label: 'Jobs', icon: Briefcase },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] min-w-[48px] rounded-xl transition-all ${
                isActive ? 'text-primary font-bold' : 'text-text-muted hover:text-text-dark'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-text-muted'}`} aria-hidden="true" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
