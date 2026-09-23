import { useState, useEffect } from 'react';
import {
  Globe, Copy, Check, Eye, ExternalLink, Sparkles,
  Github, Mail, Code2, ArrowUpRight
} from 'lucide-react';
import { fetchLatestResume, fetchProfileFromDB, updateProfileInDB } from '../services/api';

export default function PortfolioGenerator() {
  const [name, setName] = useState('Sanjay Jakhar');
  const [headline, setHeadline] = useState('Fullstack Engineer & Systems Builder');
  const [bio, setBio] = useState(
    'Passionate about writing high-performance APIs, distributed systems, and real-time developer tooling. Built InternOps to streamline internship lifecycles.'
  );
  const [githubUser, setGithubUser] = useState('');
  const [email, setEmail] = useState('sanjay@example.com');
  const [featuredProject, setFeaturedProject] = useState('InternOps Platform');
  const [projectTech, setProjectTech] = useState('Node.js, Fastify, PostgreSQL, React, Vite');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [res, prof] = await Promise.all([
          fetchLatestResume(),
          fetchProfileFromDB(),
        ]);
        if (res) {
          if (res.name) setName(res.name);
          if (res.email) setEmail(res.email);
          if (res.github_username) setGithubUser(res.github_username);
        }
        if (prof) {
          if (prof.candidate_name) setName(prof.candidate_name);
          if (prof.headline) setHeadline(prof.headline);
          if (prof.bio) setBio(prof.bio);
          if (prof.github_username) setGithubUser(prof.github_username);
          if (prof.featured_project) setFeaturedProject(prof.featured_project);
          if (prof.project_tech) setProjectTech(prof.project_tech);
        }
      } catch (e) {
        console.error('Error fetching portfolio data from MongoDB:', e);
      }
    };
    loadProfileData();
  }, []);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${githubUser || 'sanjay'}`
    : `https://fresherscompass.dev/p/${githubUser || 'sanjay'}`;

  const handleCopyLink = async () => {
    try {
      setSaving(true);
      await updateProfileInDB({
        candidate_name: name,
        headline,
        bio,
        github_username: githubUser,
        featured_project: featuredProject,
        project_tech: projectTech,
      });
    } catch (err) {
      console.warn('Could not save to MongoDB during copy:', err);
    } finally {
      setSaving(false);
    }

    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Developer Portfolio Generator
          </h1>
          <p className="text-text-body text-sm mt-1">
            Real-time live preview paired with editable profile fields. Publish your portfolio in seconds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Live Preview Button */}
          <a
            href={`/p/${githubUser || 'sanjay'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-white text-xs font-bold text-text-dark hover:bg-surface transition shadow-2xs"
          >
            <Eye className="h-4 w-4 text-primary" />
            <span>Open Public Preview</span>
            <ExternalLink className="h-3 w-3 text-text-muted" />
          </a>

          {/* Single Coral CTA (#D85A30) */}
          <button
            onClick={handleCopyLink}
            disabled={saving}
            className="btn-accent text-xs font-bold py-2.5 px-4"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Link Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>{saving ? 'Publishing...' : 'Publish & Copy Live Link'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Public URL</span>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-primary font-bold truncate">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`/p/${githubUser || 'sanjay'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate"
            >
              /p/{githubUser || 'sanjay'}
            </a>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Instant edge deployment ready</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">SEO & OpenGraph</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-success">Optimized</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Rich Twitter and LinkedIn unfurl previews</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Theme Architecture</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-text-dark">SaaS Minimalist</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Clean typography, responsive layout</p>
        </div>
      </div>

      {/* 3. Split-Screen Layout: Form Editor on Left, Live Render on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form Editor */}
        <div className="lg:col-span-5 bg-surface rounded-card border border-border p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-text-dark">Portfolio Content Fields</h2>

          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">Bio Summary</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">Featured Project</label>
            <input
              type="text"
              value={featuredProject}
              onChange={(e) => setFeaturedProject(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-dark block mb-1">Tech Stack</label>
            <input
              type="text"
              value={projectTech}
              onChange={(e) => setProjectTech(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Right: Live Preview Pane */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span className="flex items-center gap-1 font-semibold text-text-dark">
              <Eye className="h-3.5 w-3.5 text-primary" /> Live Public Preview
            </span>
            <span className="text-[11px]">Updates in real-time</span>
          </div>

          <div className="bg-white rounded-card border-2 border-border p-6 sm:p-8 shadow-sm space-y-6">
            {/* Portfolio Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <h3 className="text-2xl font-black text-text-dark">{name}</h3>
                <p className="text-sm font-semibold text-primary mt-0.5">{headline}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-text-body">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-text-muted" /> {email}
                  </span>
                  {githubUser && (
                    <span className="flex items-center gap-1 font-mono">
                      <Github className="h-3.5 w-3.5 text-text-muted" /> @{githubUser}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center font-black text-xl text-primary shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* About */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">About</h4>
              <p className="text-xs sm:text-sm text-text-body leading-relaxed">{bio}</p>
            </div>

            {/* Featured Work Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Featured Engineering Work
              </h4>
              <div className="bg-surface rounded-xl p-5 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-text-dark">{featuredProject}</h5>
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-text-body">
                  Architecture and repository indexed for automated candidate defense.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {projectTech.split(',').map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-border rounded text-[11px] font-medium text-text-dark"
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
              <span>Verified by FreshersCompass Career Twin</span>
              <span className="text-primary font-bold">100% Deterministic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
