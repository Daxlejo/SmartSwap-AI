export type ThemePreference = 'light' | 'dark';
export type LocalePreference = 'es' | 'en';

export const THEME_STORAGE_KEY = 'smartswap_theme';
export const LOCALE_STORAGE_KEY = 'smartswap_locale';

// Keys written by earlier builds; read once and migrated to the canonical keys.
const LEGACY_THEME_STORAGE_KEY = 'smartswap-theme';
const LEGACY_LOCALE_STORAGE_KEY = 'smartswap-language';

export const DEFAULT_THEME: ThemePreference = 'light';
export const DEFAULT_LOCALE: LocalePreference = 'es';

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
};
