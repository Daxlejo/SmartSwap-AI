import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  preferencesStorage,
} from '@/services/storage/preferencesStorage';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('preferencesStorage', () => {
  let storage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storage = createLocalStorageMock();
    vi.stubGlobal('window', {
      localStorage: storage,
      // A dark OS preference must not change the default theme
      matchMedia: () => ({ matches: true }),
    });
  });

  describe('theme', () => {
    it('defaults to light even when the OS prefers dark', () => {
      expect(preferencesStorage.getTheme()).toBe('light');
    });

    it('persists dark under smartswap_theme', () => {
      preferencesStorage.setTheme('dark');
      expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(preferencesStorage.getTheme()).toBe('dark');
    });

    it('migrates the legacy smartswap-theme key', () => {
      storage.setItem('smartswap-theme', 'dark');
      expect(preferencesStorage.getTheme()).toBe('dark');
      expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(storage.getItem('smartswap-theme')).toBeNull();
    });

    it('falls back to light for unknown stored values', () => {
      storage.setItem(THEME_STORAGE_KEY, 'sepia');
      expect(preferencesStorage.getTheme()).toBe('light');
    });
  });

  describe('locale', () => {
    it('defaults to Spanish', () => {
      expect(preferencesStorage.getLocale()).toBe('es');
    });

    it('persists English under smartswap_locale', () => {
      preferencesStorage.setLocale('en');
      expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
      expect(preferencesStorage.getLocale()).toBe('en');
    });

    it('migrates the legacy smartswap-language key', () => {
      storage.setItem('smartswap-language', 'en');
      expect(preferencesStorage.getLocale()).toBe('en');
      expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
      expect(storage.getItem('smartswap-language')).toBeNull();
    });
  });

  it('returns defaults when localStorage is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(preferencesStorage.getTheme()).toBe('light');
    expect(preferencesStorage.getLocale()).toBe('es');
  });
});
