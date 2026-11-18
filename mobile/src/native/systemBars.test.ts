import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const platform = vi.hoisted(() => ({
  current: 'android',
  pluginName: '',
  nativeApply: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.current },
  registerPlugin: (name: string) => {
    platform.pluginName = name;
    return { apply: platform.nativeApply };
  },
}));

import { FALLBACK_SURFACE, startSystemBarsSync, surfaceTokenToHex } from './systemBars';

/** Minimal <html> stand-in: the `dark` class and the --color-surface token it implies. */
const makeRoot = (dark: boolean, tokens = { light: '248 250 252', dark: '15 23 42' }) => {
  const state = { dark, tokens };
  const root = {
    classList: { contains: (name: string) => name === 'dark' && state.dark },
  } as unknown as HTMLElement;
  return { root, state };
};

let observers: Array<() => void> = [];
let observed: Array<{ target: unknown; options: unknown }> = [];
let disconnected = 0;

class FakeMutationObserver {
  constructor(private readonly callback: () => void) {}
  observe(target: unknown, options: unknown) {
    observed.push({ target, options });
    observers.push(this.callback);
  }
  disconnect() {
    disconnected += 1;
    observers = observers.filter((cb) => cb !== this.callback);
  }
}

const mutate = () => observers.forEach((callback) => callback());

describe('surfaceTokenToHex', () => {
  it('turns the RGB channels of the surface token into a hex color', () => {
    expect(surfaceTokenToHex(' 248 250 252')).toBe('#f8fafc');
    expect(surfaceTokenToHex('15 23 42')).toBe('#0f172a');
  });

  it('rejects anything that is not three 0-255 channels', () => {
    expect(surfaceTokenToHex('')).toBeNull();
    expect(surfaceTokenToHex('248 250')).toBeNull();
    expect(surfaceTokenToHex('248 250 256')).toBeNull();
    expect(surfaceTokenToHex('#f8fafc')).toBeNull();
  });
});

describe('startSystemBarsSync', () => {
  let current: ReturnType<typeof makeRoot>;

  beforeEach(() => {
    platform.current = 'android';
    observers = [];
    observed = [];
    disconnected = 0;
    platform.nativeApply.mockReset().mockResolvedValue(undefined);
    current = makeRoot(false);
    vi.stubGlobal('MutationObserver', FakeMutationObserver);
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: () => (current.state.dark ? current.state.tokens.dark : current.state.tokens.light),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('paints the bars with the light surface and dark icons on start', () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);
    expect(apply).toHaveBeenCalledWith({ color: '#f8fafc', dark: false });
  });

  it('follows a live switch to dark and back, once per change', () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);

    current.state.dark = true;
    mutate();
    mutate(); // another class change that does not alter the theme
    expect(apply).toHaveBeenLastCalledWith({ color: '#0f172a', dark: true });

    current.state.dark = false;
    mutate();
    expect(apply).toHaveBeenLastCalledWith({ color: '#f8fafc', dark: false });
    expect(apply).toHaveBeenCalledTimes(3);
  });

  it('falls back to the brand colors when the CSS token is missing', () => {
    current = makeRoot(true, { light: '', dark: '' });
    const apply = vi.fn().mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);
    expect(apply).toHaveBeenCalledWith({ color: FALLBACK_SURFACE.dark, dark: true });
  });

  it('retries the same colors after a failed native call', async () => {
    const apply = vi.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);
    await Promise.resolve();
    await Promise.resolve();
    mutate();
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('watches only the class attribute of the given root', () => {
    startSystemBarsSync(current.root, vi.fn().mockResolvedValue(undefined));
    expect(observed).toEqual([
      { target: current.root, options: { attributes: true, attributeFilter: ['class'] } },
    ]);
  });

  it('ignores theme changes after it is stopped', () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    const stop = startSystemBarsSync(current.root, apply);
    stop();
    current.state.dark = true;
    mutate();
    expect(disconnected).toBe(1);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('calls the native ThemeBars plugin by default', () => {
    startSystemBarsSync(current.root);
    expect(platform.pluginName).toBe('ThemeBars');
    expect(platform.nativeApply).toHaveBeenCalledWith({ color: '#f8fafc', dark: false });
  });

  it.each([
    ['an empty light token', false, '', FALLBACK_SURFACE.light],
    ['a malformed light token', false, 'rgb(1,2,3)', FALLBACK_SURFACE.light],
    ['a malformed dark token', true, 'rgb(1,2,3)', FALLBACK_SURFACE.dark],
  ])('falls back to the brand color for %s', (_label, dark, token, expected) => {
    current = makeRoot(dark, { light: token, dark: token });
    const apply = vi.fn().mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);
    expect(apply).toHaveBeenCalledWith({ color: expected, dark });
  });

  it('does nothing outside the Android app', () => {
    platform.current = 'web';
    const apply = vi.fn().mockResolvedValue(undefined);
    startSystemBarsSync(current.root, apply);
    expect(apply).not.toHaveBeenCalled();
    expect(observers).toHaveLength(0);
  });
});
