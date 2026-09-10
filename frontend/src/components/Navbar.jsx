import { Link } from 'react-router-dom';
import { Compass, Github, LogIn } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed w-full z-50 glass border-b border-border/50 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Compass className="h-8 w-8 text-primary" />
            <Link to="/" className="text-xl font-bold text-primary-dark hover:text-primary transition-colors">
              FreshersCompass
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors">
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-surface px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25">
              <Github className="h-4 w-4" />
              Connect GitHub
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
