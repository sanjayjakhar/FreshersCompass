import { ArrowRight, Code2, Bot, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32 overflow-hidden bg-surface-muted min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-light rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary-light rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-accent-light rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8 text-text-primary">
            The Ultimate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x">
              AI Career Twin
            </span>
            <br />
            for Developers
          </h1>
          <p className="mt-4 text-xl text-text-secondary leading-relaxed mb-10">
            Unify your resume, GitHub intelligence, and interview prep in one platform. Let AI guide you from your first commit to your first offer.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 bg-primary text-surface px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-xl shadow-primary/20">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
            <button className="bg-surface text-text-primary border border-border px-6 py-3 rounded-xl font-semibold hover:bg-surface-muted transition-colors">
              View Demo
            </button>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {[
            {
              title: "Codebase RAG",
              desc: "Ask natural language questions about your own GitHub repos to prep for technical deep-dives.",
              icon: <Code2 className="h-6 w-6 text-secondary" />
            },
            {
              title: "AI Interviewer",
              desc: "Simulate behavioral, system design, and DSA interviews tailored strictly to your resume.",
              icon: <Bot className="h-6 w-6 text-primary" />
            },
            {
              title: "Skill-Gap Roadmap",
              desc: "We analyze your profile against target roles and generate a personalized learning path.",
              icon: <Target className="h-6 w-6 text-accent" />
            }
          ].map((feature, i) => (
            <div key={i} className="bg-surface border border-border p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300 shadow-sm">
              <div className="bg-surface-muted w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
