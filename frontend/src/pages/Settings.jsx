import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Github, Bell, Shield, Key, Check } from 'lucide-react';
import { fetchProfileFromDB, updateProfileInDB } from '../services/api';

export default function Settings() {
  const [githubUser, setGithubUser] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfileFromDB().then((profile) => {
      if (profile?.github_username) {
        setGithubUser(profile.github_username);
      }
    });
  }, []);

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
          Manage your account integrations, AI models, and profile telemetry.
        </p>
      </div>

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
