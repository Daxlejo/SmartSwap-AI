import { useCallback, useEffect, useRef, useState } from 'react';
import { handoffService, HANDOFF_POLL_MS, type Handoff } from '@/services/routes/handoff.service';

export type HandoffLoadState = 'loading' | 'ready' | 'error';

/**
 * The delivery chat of a swap, asked again every 5 seconds while the screen is open
 * (and the app is visible). A failed poll keeps what was already shown.
 */
export const useHandoff = (routeId: string | undefined) => {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [status, setStatus] = useState<HandoffLoadState>('loading');
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!routeId || inFlight.current) return;
    inFlight.current = true;
    try {
      setHandoff(await handoffService.get(routeId));
      setStatus('ready');
    } catch {
      setStatus((previous) => (previous === 'ready' ? 'ready' : 'error'));
    } finally {
      inFlight.current = false;
    }
  }, [routeId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void refresh();
    }, HANDOFF_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { handoff, status, refresh, setHandoff };
};
