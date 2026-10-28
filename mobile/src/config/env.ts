/**
 * Frontend Typed Environment Configuration
 *
 * Exposes client-safe environment variables injected by Vite during build/runtime.
 *
 * SECURITY DIRECTIVE:
 * - Only variables prefixed with VITE_ are accessible in client-side code.
 * - NEVER reference server-side secrets (e.g. DATABASE_URL, JWT_SECRET, OPENAI_API_KEY,
 *   or SUPABASE_SERVICE_ROLE_KEY) in mobile/ source code.
 */

export interface EnvConfig {
  readonly apiUrl: string;
  readonly appEnv: 'development' | 'production' | 'test' | string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  /** Shared password of the seeded demo accounts; enables the demo account switcher when set. */
  readonly demoPassword: string | undefined;
  readonly isDemoMode: boolean;
}

export const env: EnvConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  isProduction: (import.meta.env.VITE_APP_ENV || 'development') === 'production',
  isDevelopment: (import.meta.env.VITE_APP_ENV || 'development') === 'development',
  demoPassword: import.meta.env.VITE_DEMO_PASSWORD || undefined,
  isDemoMode: Boolean(import.meta.env.VITE_DEMO_PASSWORD),
};

export default env;
