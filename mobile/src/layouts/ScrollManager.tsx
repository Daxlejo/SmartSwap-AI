import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Screens that keep their scroll position when the user comes back to them. */
const REMEMBERED_PATHS = new Set(['/explore']);

const savedPositions = new Map<string, number>();

/** Where a screen opens: at the top, or where the user left a remembered screen. */
const scrollTopFor = (pathname: string): number =>
  REMEMBERED_PATHS.has(pathname) ? savedPositions.get(pathname) ?? 0 : 0;

/**
 * Every screen opens at the top, also when going back to it. Explore is the
 * exception: it returns to where the user was, so the list is not lost after
 * looking at an item. Replaces React Router's ScrollRestoration, which restored
 * every screen on back.
 */
export const ScrollManager = () => {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window.history.scrollRestoration === 'string') {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Remember the position of the remembered screen while the user is on it
  useEffect(() => {
    if (!REMEMBERED_PATHS.has(pathname)) return;
    // The jump to the top of the next screen also fires `scroll`; it is not Explore's
    const save = () => {
      if (window.location.pathname === pathname) savedPositions.set(pathname, window.scrollY);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [pathname]);

  useLayoutEffect(() => {
    const samePage = lastPathname.current === pathname;
    lastPathname.current = pathname;
    // Replacing the entry of the same screen (a choice kept in the URL) must not jump
    if (navigationType === 'REPLACE' && samePage) return;
    window.scrollTo({ top: scrollTopFor(pathname), left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, key, navigationType]);

  return null;
};
