import { useEffect, useRef } from 'react';

/**
 * Brings a form error into view: every time `attempt` changes to a value above 0 the referenced
 * alert scrolls smoothly to the middle of the screen (instantly with reduced motion) and takes
 * focus, so screen readers announce it and the user sees it even when they were further down.
 */
export function useRevealOnError<T extends HTMLElement>(attempt: number) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (attempt <= 0) return;
    const element = ref.current;
    if (!element) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }, [attempt]);

  return ref;
}
