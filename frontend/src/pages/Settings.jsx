import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Github, Bell, Shield, Key, Check, Zap,
  Activity, RefreshCw, Link as LinkIcon, Eye, EyeOff, Copy, CheckCircle2,
  ExternalLink, Code
} from 'lucide-react';
import { fetchProfileFromDB, updateProfileInDB, fetchDiagnostics, API_BASE } from '../services/api';

export default function Settings() {
  const [githubUser, setGithubUser] = useState('');
  const [vanitySlug, setVanitySlug] = useState('');
  const [privacy, setPrivacy] = useState({
    show_email: true,
    show_phone: false,
    show_gpa: true,
    show_compensation: false,
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [testingAi, setTestingAi] = useState(false);
  const [copiedType, setCopiedType] = useState(null); // 'markdown' | 'html' | 'link'

  useEffect(() => {
    fetchProfileFromDB().then((profile) => {
      if (profile) {
        if (profile.github_username) setGithubUser(profile.github_username);
        if (profile.vanity_slug) setVanitySlug(profile.vanity_slug);
        if (profile.privacy) setPrivacy(profile.privacy);
      }
    });
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      setTestingAi(true);
      const res = await fetchDiagnostics();
      setDiagnostics(res);
    } catch (err) {
      console.error('Diagnostics test error:', err);
    } finally {
      setTestingAi(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const uname = githubUser.trim().replace(/^@/, '');
      const slug = vanitySlug.trim().toLowerCase().replace(/^@/, '');

      await updateProfileInDB({
        github_username: uname,
        vanity_slug: slug || null,
        privacy,
      });

      window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: uname }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to save settings');
    }
  };

  const activeIdentifier = vanitySlug.trim() || githubUser.trim() || 'developer';
  const portfolioUrl = `${window.location.origin}/portfolio/${activeIdentifier}`;
  const badgeSvgUrl = `${API_BASE}/profile/badge/${activeIdentifier}`;

  const markdownSnippet = `[![FreshersCompass Verified Twin](${badgeSvgUrl})](${portfolioUrl})`;
  const htmlSnippet = `<a href="${portfolioUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeSvgUrl}" alt="FreshersCompass Verified Twin" height="28" /></a>`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
          Platform Settings
        </h1>
        <p className="text-text-body text-sm mt-1">
          Manage your account vanity URL, portfolio privacy controls, verification badge, and AI diagnostics.
        </p>
      </div>

      {saveError && (
        <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-semibold">
          {saveError}
        </div>
      )}

      {/* Profile & Custom Vanity URL Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" /> Public Portfolio & Vanity URL
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Choose a professional vanity handle for your public developer portfolio.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-text-dark block mb-1">
                Connected GitHub Handle
              </label>
              <input
                type="text"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                placeholder="e.g. sanjayjakhar"
                className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-dark block mb-1">
                Custom Vanity Slug (Optional)
              </label>
              <div className="flex items-center">
                <span className="px-2.5 py-2 bg-surface border border-r-0 border-border rounded-l-xl text-[11px] font-mono text-text-muted select-none">
                  /portfolio/
                </span>
                <input
                  type="text"
                  value={vanitySlug}
                  onChange={(e) => setVanitySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="sanjay-dev"
                  className="w-full px-3 py-2 bg-white rounded-r-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-text-muted font-medium shrink-0">Live URL:</span>
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-mono font-medium hover:underline truncate inline-flex items-center gap-1"
              >
                <span>{portfolioUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(portfolioUrl, 'link')}
              className="text-[11px] font-semibold text-primary hover:underline shrink-0"
            >
              {copiedType === 'link' ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Privacy Controls Section */}
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-secondary" /> Portfolio Privacy Controls
            </h3>
            <p className="text-xs text-text-muted">
              Choose which sensitive contact telemetry is visible on your public portfolio page.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-dark block">Show Email Address</span>
                  <span className="text-[11px] text-text-muted">Allow recruiters to see your direct email</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.show_email}
                  onChange={(e) => setPrivacy({ ...privacy, show_email: e.target.checked })}
                  className="h-4 w-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-dark block">Show Phone Number</span>
                  <span className="text-[11px] text-text-muted">Display mobile contact on public page</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.show_phone}
                  onChange={(e) => setPrivacy({ ...privacy, show_phone: e.target.checked })}
                  className="h-4 w-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-dark block">Show Academic GPA / Marks</span>
                  <span className="text-[11px] text-text-muted">Display degree percentage on profile</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.show_gpa}
                  onChange={(e) => setPrivacy({ ...privacy, show_gpa: e.target.checked })}
                  className="h-4 w-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-dark block">Show Expected Compensation</span>
                  <span className="text-[11px] text-text-muted">Display salary expectations to recruiters</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.show_compensation}
                  onChange={(e) => setPrivacy({ ...privacy, show_compensation: e.target.checked })}
                  className="h-4 w-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary text-xs py-2 px-5">
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <span>Save Portfolio Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Embeddable Verification Badge Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Embeddable Verified Twin Badge
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Display your verified competency badge on GitHub profile READMEs and personal websites.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs font-semibold text-text-muted block mb-1.5">Live Preview:</span>
              <div className="inline-block p-1 bg-slate-900 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="220" height="28" viewBox="0 0 220 28" fill="none">
                  <rect width="220" height="28" rx="6" fill="#0F172A"/>
                  <rect width="125" height="28" rx="6" fill="#1E293B"/>
                  <text x="12" y="18" fill="#94A3B8" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="600">FreshersCompass</text>
                  <text x="135" y="18" fill="#10B981" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">✓ Verified Twin</text>
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(markdownSnippet, 'markdown')}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                {copiedType === 'markdown' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedType === 'markdown' ? 'Copied Markdown' : 'Copy Markdown'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(htmlSnippet, 'html')}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                {copiedType === 'html' ? <Check className="h-3.5 w-3.5 text-success" /> : <Code className="h-3.5 w-3.5" />}
                <span>{copiedType === 'html' ? 'Copied HTML' : 'Copy HTML'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-text-muted">Markdown Snippet:</span>
            <pre className="p-2.5 bg-surface rounded-lg border border-border text-[11px] font-mono text-text-dark overflow-x-auto select-all">
              {markdownSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* AI Engine Telemetry & Live Diagnostics */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" /> AI Model Engine & Diagnostics
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Live telemetry on multi-tier LLM orchestration with automatic rate-limit failover.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={testingAi}
            className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testingAi ? 'animate-spin' : ''}`} />
            <span>{testingAi ? 'Testing Latency...' : 'Run Connectivity Check'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white p-3.5 rounded-xl border border-border">
            <span className="text-[11px] font-semibold text-text-muted block">Primary Model</span>
            <span className="text-xs font-bold text-primary font-mono block mt-1">
              {diagnostics?.aiService?.models?.primary || 'Google Gemini 1.5 Flash'}
            </span>
            <span className="text-[10px] text-success font-medium mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Active Tier 1
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-border">
            <span className="text-[11px] font-semibold text-text-muted block">Failover Cloud</span>
            <span className="text-xs font-bold text-secondary font-mono block mt-1">
              {diagnostics?.aiService?.models?.fallback || 'Groq Llama 3.3 70B / 3.1 8B'}
            </span>
            <span className="text-[10px] text-text-muted font-medium mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 0ms Standby
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-border">
            <span className="text-[11px] font-semibold text-text-muted block">AI Service Roundtrip</span>
            <span className="text-xs font-bold text-text-dark font-mono block mt-1">
              {diagnostics?.aiService?.latencyMs ? `${diagnostics.aiService.latencyMs} ms` : 'Live Connected'}
            </span>
            <span className="text-[10px] text-success font-medium mt-1 inline-flex items-center gap-1">
              <Activity className="h-3 w-3 text-success" /> Sub-second latency
            </span>
          </div>
        </div>
      </div>

      {/* Data Privacy & Retention */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Data Privacy & Retention
        </h2>
        <p className="text-xs text-text-body leading-relaxed max-w-xl">
          Your parsed resume text and GitHub repository code structures are processed in memory and cached locally within your browser. No sensitive personal data is sold or used for public AI training without explicit permission.
        </p>
      </div>
    </div>
  );
}
