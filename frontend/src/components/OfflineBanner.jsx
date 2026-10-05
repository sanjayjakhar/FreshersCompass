import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (justReconnected) {
    return (
      <aside aria-label="Network Status" className="bg-emerald-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-between shadow-md transition-all duration-300 z-50">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Wifi className="h-4 w-4 shrink-0 text-emerald-100" />
          <span>Connection restored! Fresh data synced.</span>
        </div>
      </aside>
    );
  }

  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Offline Mode Notification"
      className="bg-slate-900 border-b border-amber-500/30 text-amber-300 text-xs py-2 px-4 shadow-lg transition-all duration-300 z-50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="h-3.5 w-3.5" />
          </span>
          <div>
            <span className="font-bold text-amber-200">Offline Mode Active — </span>
            <span className="text-slate-300">
              Cached interview prep notes, roadmaps, and cheat sheets remain available.
            </span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss offline notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
