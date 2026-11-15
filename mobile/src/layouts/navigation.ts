/** The four tabs of the BottomNav. Publish is in the BottomNav too, but it is a flow with its own back arrow. */
export const MAIN_TABS = ['/home', '/explore', '/swaps', '/profile'] as const;

/** Screens where Android's back button closes the app instead of going back. */
const EXIT_PATHS = ['/home', '/login', '/splash', '/', '/index.html'];

export const isMainTab = (pathname: string): boolean =>
  (MAIN_TABS as readonly string[]).includes(pathname);

/**
 * What Android's back button does on a screen: on Home (and the sign-in screens)
 * it closes the app, on any other tab it goes to Home, and on a secondary screen
 * it goes back one step.
 */
export type BackAction = 'exit' | 'home' | 'back';

export const backActionFor = (pathname: string): BackAction => {
  if (EXIT_PATHS.includes(pathname)) return 'exit';
  if (isMainTab(pathname)) return 'home';
  return 'back';
};
