import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: 'android',
  addListener: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => mocks.platform },
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.addListener },
}));

import { WARMUP_MIN_INTERVAL_MS, createWarmup, startServerWarmup } from './serverWarmup';

describe('createWarmup', () => {
  it('pings at most once per interval', () => {
    let now = 0;
    const ping = vi.fn().mockResolvedValue(true);
    const warmup = createWarmup(ping, () => now);

    warmup();
    now = WARMUP_MIN_INTERVAL_MS - 1;
    warmup();
    expect(ping).toHaveBeenCalledTimes(1);

    now = WARMUP_MIN_INTERVAL_MS;
    warmup();
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('swallows a failing ping', async () => {
    const ping = vi.fn().mockRejectedValue(new Error('offline'));
    expect(() => createWarmup(ping)()).not.toThrow();
    await Promise.resolve();
  });
});

describe('startServerWarmup', () => {
  beforeEach(() => {
    mocks.addListener.mockReset();
    mocks.platform = 'android';
  });

  it('pings on start and again whenever the Android app resumes', () => {
    const warmup = vi.fn();
    startServerWarmup(warmup);

    expect(warmup).toHaveBeenCalledTimes(1);
    expect(mocks.addListener).toHaveBeenCalledWith('resume', warmup);
  });

  it('only pings on start in the browser', () => {
    mocks.platform = 'web';
    const warmup = vi.fn();
    startServerWarmup(warmup);

    expect(warmup).toHaveBeenCalledTimes(1);
    expect(mocks.addListener).not.toHaveBeenCalled();
  });
});
