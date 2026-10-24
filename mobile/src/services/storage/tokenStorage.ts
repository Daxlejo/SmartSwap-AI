const TOKEN_STORAGE_KEY = 'smartswap_jwt_token';
const REFRESH_TOKEN_STORAGE_KEY = 'smartswap_refresh_token';

export const tokenStorage = {
  getToken(): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  },

  clearToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  },

  hasToken(): boolean {
    const token = this.getToken();
    return Boolean(token && token.trim().length > 0);
  },

  getRefreshToken(): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(refreshToken: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

export const getToken = (): string | null => tokenStorage.getToken();
export const setToken = (token: string): void => tokenStorage.setToken(token);
export const clearToken = (): void => tokenStorage.clearToken();
export const hasToken = (): boolean => tokenStorage.hasToken();

export default tokenStorage;
