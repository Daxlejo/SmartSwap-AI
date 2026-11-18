import { useCallback, useEffect, useRef, useState } from 'react';
import { handoffService, HANDOFF_POLL_MS, type Handoff } from '@/services/routes/handoff.service';

export type HandoffLoadState = 'loading' | 'ready' | 'error';

/**
 * The delivery chat of a swap, asked again every 5 seconds while the screen is open
 * (and the app is visible). A failed poll keeps what was already shown.
 *
 * Every request and every action result takes a ticket; only the newest ticket may change
 * the state, so a slow poll never overwrites a message just sent or a date just proposed.
 */
export const useHandoff = (routeId: string | undefined) => {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [status, setStatus] = useState<HandoffLoadState>('loading');
  const ticket = useRef(0);
  const pollInFlight = useRef(false);

  const load = useCallback(
    async (fromPoll: boolean) => {
      if (!routeId || (fromPoll && pollInFlight.current)) return;
      const mine = ++ticket.current;
      if (fromPoll) pollInFlight.current = true;
      try {
        const next = await handoffService.get(routeId);
        if (mine === ticket.current) {
          setHandoff(next);
          setStatus('ready');
        }
      } catch {
        if (mine === ticket.current) setStatus((previous) => (previous === 'ready' ? 'ready' : 'error'));
      } finally {
        if (fromPoll) pollInFlight.current = false;
      }
    },
    [routeId],
  );

  /** Shows the answer of an action (send, propose, confirm, report) and discards older polls. */
  const apply = useCallback((next: Handoff) => {
    ticket.current += 1;
    setHandoff(next);
    setStatus('ready');
  }, []);

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void load(true);
    }, HANDOFF_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return { handoff, status, refresh, apply };
};
