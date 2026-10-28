import { useEffect, useState } from 'react';
import { healthService } from '@/services/health/health.service';

export type ServerStatus = 'checking' | 'waking' | 'online' | 'offline';

/** After this long without an answer we assume a Render cold start and tell the user. */
export const SLOW_RESPONSE_MS = 2500;
export const RETRY_INTERVAL_MS = 10000;

/**
 * Tracks API availability from app start: `waking` while the first health check is slow,
 * `offline` (retrying every 10s) when it fails, and `online` once it answers.
 */
export const useServerStatus = (): ServerStatus => {
  const [status, setStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const slowTimer = setTimeout(() => {
      if (!cancelled) {
        setStatus((current) => (current === 'checking' ? 'waking' : current));
      }
    }, SLOW_RESPONSE_MS);

    const check = async () => {
      const isUp = await healthService.isServerUp();
      if (cancelled) return;
      if (isUp) {
        clearTimeout(slowTimer);
        setStatus('online');
        return;
      }
      setStatus('offline');
      retryTimer = setTimeout(check, RETRY_INTERVAL_MS);
    };

    void check();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return status;
};
