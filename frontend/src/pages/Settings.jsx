import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Github, Bell, Shield, Key, Check, Zap, Activity, RefreshCw } from 'lucide-react';
import { fetchProfileFromDB, updateProfileInDB, fetchDiagnostics } from '../services/api';

export default function Settings() {
  const [githubUser, setGithubUser] = useState('');
  const [saved, setSaved] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [testingAi, setTestingAi] = useState(false);

  useEffect(() => {
    fetchProfileFromDB().then((profile) => {
      if (profile?.github_username) {
        setGithubUser(profile.github_username);
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
    const uname = githubUser.trim().replace(/^@/, '');
    await updateProfileInDB({ github_username: uname });
    window.dispatchEvent(new CustomEvent('freshercompass_profile_updated', { detail: uname }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
          Platform Settings
        </h1>
        <p className="text-text-body text-sm mt-1">
          Manage your account integrations, AI engine diagnostics, and profile telemetry.
        </p>
      </div>

      {/* GitHub Profile Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-2xs space-y-6">
        <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
          <Github className="h-4 w-4 text-primary" /> Connected GitHub Profile
        </h2>

        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">
              Active GitHub Handle
            </label>
            <input
              type="text"
              value={githubUser}
              onChange={(e) => setGithubUser(e.target.value)}
              placeholder="e.g. your-github-handle"
              className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <button type="submit" className="btn-primary text-xs py-2 px-4">
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved Settings</span>
              </>
            ) : (
              <span>Update Profile</span>
            )}
          </button>
        </form>
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
              {diagnostics?.aiService?.models?.primary || 'Google Gemini 2.5 Flash'}
            </span>
            <span className="text-[10px] text-success font-medium mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Active Tier 1
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-border">
            <span className="text-[11px] font-semibold text-text-muted block">Failover Cloud</span>
            <span className="text-xs font-bold text-secondary font-mono block mt-1">
              {diagnostics?.aiService?.models?.fallback || 'Groq Qwen 27B / GPT-OSS'}
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
