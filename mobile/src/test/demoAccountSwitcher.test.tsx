import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    currentUser: null,
    isAuthenticated: false,
    loginWithEmail: vi.fn(),
    logout: vi.fn(),
  }),
}));

/** Release builds ship with VITE_DEMO_PASSWORD empty: no switcher and no password in the APK. */
describe('DemoAccountSwitcher without VITE_DEMO_PASSWORD', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('turns demo mode off and renders nothing when the variable is empty', async () => {
    vi.stubEnv('VITE_DEMO_PASSWORD', '');
    vi.resetModules();
    const { env } = await import('@/config/env');
    await import('@/i18n');
    const { DemoAccountSwitcher } = await import('@/components/DemoAccountSwitcher');

    expect(env.isDemoMode).toBe(false);
    expect(env.demoPassword).toBeUndefined();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DemoAccountSwitcher />
      </MemoryRouter>,
    );
    expect(html).toBe('');
  });
});
