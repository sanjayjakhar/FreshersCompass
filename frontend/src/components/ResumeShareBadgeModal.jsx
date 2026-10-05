import { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Share2, Sparkles, Download, Code, Globe, ShieldCheck } from 'lucide-react';

export default function ResumeShareBadgeModal({ isOpen, onClose, parsedData }) {
  const [copiedType, setCopiedType] = useState(null); // 'markdown' | 'html' | 'svg'
  const [badgeTheme, setBadgeTheme] = useState('dark'); // 'dark' | 'light' | 'emerald'
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const score = parsedData?.ats_score || 85;
  const candidateName = parsedData?.name || 'FreshersCompass Candidate';
  const topSkills = parsedData?.skills?.slice(0, 4) || ['React', 'Node.js', 'System Design'];

  const badgeColor = score >= 80 ? 'emerald' : score >= 60 ? 'blue' : 'amber';
  const hexColor = score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : '#F59E0B';

  const shieldsUrl = `https://img.shields.io/badge/FreshersCompass_ATS-${score}%2F100-${badgeColor}?style=for-the-badge&logo=target&logoColor=white`;
  const markdownSnippet = `[![FreshersCompass ATS Readiness](${shieldsUrl})](https://fresherscompass.dev)`;
  const htmlSnippet = `<a href="https://fresherscompass.dev" target="_blank" rel="noopener noreferrer">\n  <img src="${shieldsUrl}" alt="FreshersCompass ATS Score ${score}/100" />\n</a>`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Generate dynamic standalone vector SVG card
  const svgCardData = `
<svg width="600" height="315" viewBox="0 0 600 315" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${badgeTheme === 'light' ? '#FFFFFF' : '#0F172A'}" />
      <stop offset="100%" stop-color="${badgeTheme === 'light' ? '#F8FAFC' : '#1E293B'}" />
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${hexColor}" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="600" height="315" rx="16" fill="url(#bgGrad)" stroke="${badgeTheme === 'light' ? '#E2E8F0' : '#334155'}" stroke-width="2"/>

  <!-- Logo and Header -->
  <circle cx="56" cy="56" r="22" fill="#185FA5" opacity="0.2"/>
  <circle cx="56" cy="56" r="14" fill="#185FA5"/>
  <text x="90" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${badgeTheme === 'light' ? '#0F172A' : '#F8FAFC'}">FreshersCompass</text>
  <text x="90" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="${badgeTheme === 'light' ? '#64748B' : '#94A3B8'}">Verified ATS Candidate Readiness</text>

  <!-- Candidate Name -->
  <text x="48" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="${badgeTheme === 'light' ? '#0F172A' : '#FFFFFF'}">${candidateName}</text>

  <!-- Verified Skills -->
  <text x="48" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="${badgeTheme === 'light' ? '#475569' : '#CBD5E1'}">VERIFIED KEYWORDS:</text>
  <g transform="translate(48, 178)">
    ${topSkills.map((skill, i) => `
      <g transform="translate(${i * 105}, 0)">
        <rect width="95" height="26" rx="6" fill="${badgeTheme === 'light' ? '#F1F5F9' : '#334155'}" stroke="${badgeTheme === 'light' ? '#CBD5E1' : '#475569'}" stroke-width="1"/>
        <text x="47" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="${badgeTheme === 'light' ? '#1E293B' : '#F1F5F9'}" text-anchor="middle">${skill}</text>
      </g>
    `).join('')}
  </g>

  <!-- Score Ring / Box -->
  <g transform="translate(430, 80)">
    <rect width="120" height="120" rx="20" fill="${badgeTheme === 'light' ? '#F0FDF4' : '#064E3B'}" stroke="${hexColor}" stroke-width="2"/>
    <text x="60" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="${hexColor}" text-anchor="middle">${score}</text>
    <text x="60" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="${badgeTheme === 'light' ? '#065F46' : '#A7F3D0'}" text-anchor="middle">ATS INDEX</text>
    <text x="60" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="${badgeTheme === 'light' ? '#047857' : '#6EE7B7'}" text-anchor="middle">TOP 5% TIER</text>
  </g>

  <!-- Footer Watermark -->
  <line x1="48" y1="260" x2="552" y2="260" stroke="${badgeTheme === 'light' ? '#E2E8F0' : '#334155'}" stroke-width="1"/>
  <text x="48" y="285" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="${badgeTheme === 'light' ? '#94A3B8' : '#64748B'}">Deterministic Offline Evaluation • fresherscompass.dev</text>
  <text x="552" y="285" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="${hexColor}" text-anchor="end">PASSED ATS SCREENING</text>
</svg>
  `.trim();

  const downloadSvgBadge = () => {
    const blob = new Blob([svgCardData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName.replace(/\s+/g, '_')}_FreshersCompass_Badge.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-badge-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h2 id="share-badge-title" className="text-base font-bold text-text-dark">
                Share Verified ATS Score Badge
              </h2>
              <p className="text-xs text-text-body">
                Embed your verified ATS benchmark in your GitHub profile README or portfolio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-dark hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-dark uppercase tracking-wider">
                Social Preview Card (Vector SVG)
              </span>
              <div className="flex items-center gap-1.5">
                {(['dark', 'light']).map((th) => (
                  <button
                    key={th}
                    onClick={() => setBadgeTheme(th)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize border transition-all ${
                      badgeTheme === th
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-text-body border-border hover:bg-slate-50'
                    }`}
                  >
                    {th} Theme
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Render Box */}
            <div
              className="rounded-xl overflow-hidden border border-border shadow-inner flex items-center justify-center bg-slate-900 p-2"
              dangerouslySetInnerHTML={{ __html: svgCardData }}
            />

            <div className="flex justify-end">
              <button
                onClick={downloadSvgBadge}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Vector Card (.svg)</span>
              </button>
            </div>
          </div>

          {/* Shields.io Badge Markdown snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-dark flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-primary" />
                <span>GitHub README Markdown</span>
              </label>
              <button
                onClick={() => copyToClipboard(markdownSnippet, 'markdown')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                {copiedType === 'markdown' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span className="text-success">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-3 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
              {markdownSnippet}
            </pre>
          </div>

          {/* HTML Embed Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-dark flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>Portfolio Website HTML Embed</span>
              </label>
              <button
                onClick={() => copyToClipboard(htmlSnippet, 'html')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                {copiedType === 'html' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span className="text-success">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-3 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
              {htmlSnippet}
            </pre>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="text-[11px] leading-relaxed">
              <strong>Offline & Privacy Preserved:</strong> SVG generation and badge codes run entirely inside your browser without uploading your personal contact information to any external server.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
