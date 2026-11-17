import { Capacitor, registerPlugin } from '@capacitor/core';

export interface ThemeBarsOptions {
  /** Background behind the status and navigation bars, as `#rrggbb`. */
  color: string;
  /** True for light icons on a dark bar. */
  dark: boolean;
}

interface ThemeBarsPlugin {
  apply(options: ThemeBarsOptions): Promise<void>;
}

/** Native side: android/app/src/main/java/com/smartswap/app/ThemeBarsPlugin.java */
const ThemeBars = registerPlugin<ThemeBarsPlugin>('ThemeBars');

/** Brand neutral backgrounds (CLAUDE.md), used when the CSS token cannot be read. */
export const FALLBACK_SURFACE = { light: '#f8fafc', dark: '#0f172a' } as const;

const toHex = (channel: number): string => channel.toString(16).padStart(2, '0');

/**
 * Turns the `--color-surface` token ("248 250 252") into `#f8fafc`.
 * Returns null for anything that is not three 0–255 channels.
 */
export const surfaceTokenToHex = (token: string): string | null => {
  const channels = token.trim().split(/\s+/).map(Number);
  if (channels.length !== 3 || channels.some((c) => !Number.isInteger(c) || c < 0 || c > 255)) {
    return null;
  }
  return `#${channels.map(toHex).join('')}`;
};

/** Bar colors for the theme currently applied to `root` (the `dark` class from ThemeContext). */
export const readThemeBars = (root: HTMLElement): ThemeBarsOptions => {
  const dark = root.classList.contains('dark');
  const token = getComputedStyle(root).getPropertyValue('--color-surface');
  const color = surfaceTokenToHex(token) ?? (dark ? FALLBACK_SURFACE.dark : FALLBACK_SURFACE.light);
  return { color, dark };
};

/**
 * Keeps the Android status and navigation bars on the app's surface color: once at
 * start and again every time the theme class on <html> changes (live toggle).
 * Does nothing outside the Android app. Returns a function that stops syncing.
 */
export const startSystemBarsSync = (
  root: HTMLElement = document.documentElement,
  apply: (options: ThemeBarsOptions) => Promise<void> = (options) => ThemeBars.apply(options),
): (() => void) => {
  if (Capacitor.getPlatform() !== 'android') return () => undefined;

  let last = '';
  const sync = () => {
    const next = readThemeBars(root);
    const key = `${next.color}|${next.dark}`;
    if (key === last) return;
    last = key;
    // A failed native call only leaves the previous bar colors; never break the app for it
    apply(next).catch(() => {
      last = '';
    });
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};
