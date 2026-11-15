export type ThemePreference = 'light' | 'dark';
export type LocalePreference = 'es' | 'en';
export type LocationScopePreference = 'nearby' | 'department' | 'country';

export const THEME_STORAGE_KEY = 'smartswap_theme';
export const LOCALE_STORAGE_KEY = 'smartswap_locale';
export const LOCATION_SCOPE_STORAGE_KEY = 'smartswap_location_scope';
/** Prefix of the per-user flag that hides the first-run introduction once seen. */
export const ONBOARDING_STORAGE_PREFIX = 'smartswap_onboarding_done_';

// Keys written by earlier builds; read once and migrated to the canonical keys.
const LEGACY_THEME_STORAGE_KEY = 'smartswap-theme';
const LEGACY_LOCALE_STORAGE_KEY = 'smartswap-language';

export const DEFAULT_THEME: ThemePreference = 'light';
export const DEFAULT_LOCALE: LocalePreference = 'es';
export const DEFAULT_LOCATION_SCOPE: LocationScopePreference = 'nearby';

const getStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
};

const readWithMigration = (key: string, legacyKey: string): string | null => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const current = storage.getItem(key);
    if (current !== null) return current;

    const legacy = storage.getItem(legacyKey);
    if (legacy !== null) {
      storage.setItem(key, legacy);
      storage.removeItem(legacyKey);
    }
    return legacy;
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted environments
  }
};

export const preferencesStorage = {
  /**
   * Light is the mandatory default: the OS color scheme is intentionally ignored.
   */
  getTheme(): ThemePreference {
    const saved = readWithMigration(THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : DEFAULT_THEME;
  },

  setTheme(theme: ThemePreference): void {
    write(THEME_STORAGE_KEY, theme);
  },

  /**
   * Spanish is the mandatory default: the browser language is intentionally ignored.
   */
  getLocale(): LocalePreference {
    const saved = readWithMigration(LOCALE_STORAGE_KEY, LEGACY_LOCALE_STORAGE_KEY);
    return saved === 'en' || saved === 'es' ? saved : DEFAULT_LOCALE;
  },

  setLocale(locale: LocalePreference): void {
    write(LOCALE_STORAGE_KEY, locale);
  },

  /** How far from home the user wants to see items; nearby by default. */
  getLocationScope(): LocationScopePreference {
    const saved = getStorage()?.getItem(LOCATION_SCOPE_STORAGE_KEY) ?? null;
    return saved === 'nearby' || saved === 'department' || saved === 'country'
      ? saved
      : DEFAULT_LOCATION_SCOPE;
  },

  setLocationScope(scope: LocationScopePreference): void {
    write(LOCATION_SCOPE_STORAGE_KEY, scope);
  },

  /** Whether this user already saw (or skipped) the first-run introduction on this device. */
  isOnboardingDone(userId: string): boolean {
    try {
      return getStorage()?.getItem(`${ONBOARDING_STORAGE_PREFIX}${userId}`) === '1';
    } catch {
      return false;
    }
  },

  markOnboardingDone(userId: string): void {
    write(`${ONBOARDING_STORAGE_PREFIX}${userId}`, '1');
  },
};
