import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  startSystemBarsSync: vi.fn(),
  startServerWarmup: vi.fn(),
}));
vi.mock('./systemBars', () => ({ startSystemBarsSync: mocks.startSystemBarsSync }));
vi.mock('./serverWarmup', () => ({ startServerWarmup: mocks.startServerWarmup }));

import { initNative } from './index';

describe('initNative', () => {
  beforeEach(() => {
    mocks.startSystemBarsSync.mockReset();
    mocks.startServerWarmup.mockReset();
  });

  it('starts the bar sync and the server warm-up once', () => {
    initNative();
    expect(mocks.startSystemBarsSync).toHaveBeenCalledTimes(1);
    expect(mocks.startServerWarmup).toHaveBeenCalledTimes(1);
  });

  it('keeps going when one piece throws, so React still mounts', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.startSystemBarsSync.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => initNative()).not.toThrow();
    expect(mocks.startServerWarmup).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
