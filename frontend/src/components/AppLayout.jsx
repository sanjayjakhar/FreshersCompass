import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-text-body flex font-sans">
      {/* Skip to Content accessible link for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-card focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-semibold text-xs transition-all"
      >
        Skip to main content
      </a>

      {/* Persistent Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Bar */}
        <TopBar setMobileOpen={setMobileOpen} />

        {/* Page Content Container with breathing room (pb-24 on mobile for bottom nav) */}
        <main
          id="main-content"
          role="main"
          aria-label="Candidate Cockpit Main Content"
          tabIndex={-1}
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
