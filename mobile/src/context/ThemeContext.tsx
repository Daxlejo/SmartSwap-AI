import React, { createContext, useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'smartswap-theme';

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (error) {
    console.error('Error reading theme from localStorage:', error);
  }
  return getSystemTheme();
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
      applyTheme(newTheme);
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Keep DOM in sync with state on mount & change
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Sync with OS preference if user has not explicitly persisted a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          const systemTheme: Theme = e.matches ? 'dark' : 'light';
          setThemeState(systemTheme);
          applyTheme(systemTheme);
        }
      } catch {
        // Fallback for restricted storage access
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [applyTheme]);

  const value: ThemeContextValue = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
