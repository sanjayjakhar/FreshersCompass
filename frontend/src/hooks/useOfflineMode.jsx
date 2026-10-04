import { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { api } from '../services/api';

const OFFLINE_EVENT = 'freshercompass_offline_mode';

/**
 * Shared offline-mode signal.
 *
 * Two sources feed it: the ai-service breaker state on mount, and any response
 * that reports `offline_mode: true` while the user works. The second source
 * matters because a provider can fail mid-session, after the initial poll said
 * everything was healthy.
 */
export const useOfflineMode = () => {
  const [offline, setOffline] = useState(false);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/llm/status');
      // status === 'unknown' means the ai-service was unreachable; do not
      // claim offline mode on the strength of a failed probe.
      setOffline(res.data?.status === 'ok' && Boolean(res.data?.offline_mode));
    } catch (err) {
      setOffline(false);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Another view of the app may learn about an outage first.
    const onOfflineChange = (event) => setOffline(Boolean(event.detail?.offline));

    // A tab left open while the provider died should still notice.
    const interval = setInterval(refresh, 60000);

    window.addEventListener(OFFLINE_EVENT, onOfflineChange);
    return () => {
      window.removeEventListener(OFFLINE_EVENT, onOfflineChange);
      clearInterval(interval);
    };
  }, [refresh]);

  const report = useCallback((isOffline) => {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_EVENT, { detail: { offline: Boolean(isOffline) } })
    );
  }, []);

  return { offline, checked, refresh, report };
};

export function OfflineModeBadge({ className = '' }) {
  const { offline, checked } = useOfflineMode();

  if (!checked || !offline) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[11px] font-bold ${className}`}
      title="AI providers are unreachable. Content below is generated deterministically from your indexed code and profile."
    >
      <WifiOff className="h-3 w-3" />
      <span>Offline Mode Active</span>
    </span>
  );
}

export { OFFLINE_EVENT };