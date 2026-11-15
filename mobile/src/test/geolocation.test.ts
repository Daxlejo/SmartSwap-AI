import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    getCurrentPosition: mocks.getCurrentPosition,
  },
}));

import {
  GeolocationError,
  HIGH_ACCURACY,
  LOW_ACCURACY,
  classifyGeolocationFailure,
  getApproximatePosition,
} from '@/services/geo/geolocation';

const fix = { coords: { latitude: 1.2136, longitude: -77.2811 } };

describe('getApproximatePosition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.isNativePlatform.mockReturnValue(false);
  });

  it('reads the position straight from the browser API on the web', async () => {
    mocks.getCurrentPosition.mockResolvedValue(fix);

    await expect(getApproximatePosition()).resolves.toEqual({
      latitude: 1.2136,
      longitude: -77.2811,
    });
    expect(mocks.checkPermissions).not.toHaveBeenCalled();
    expect(mocks.getCurrentPosition).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: false }),
    );
  });

  it('settles the permission before reading the position on a native device', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(fix);

    await getApproximatePosition();

    expect(mocks.requestPermissions).toHaveBeenCalledWith({ permissions: ['location', 'coarseLocation'] });
    expect(mocks.requestPermissions.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getCurrentPosition.mock.invocationCallOrder[0],
    );
  });

  it('does not ask again when the permission was already granted', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(fix);

    await getApproximatePosition();

    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('reports a denied permission without reading the position', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });

    await expect(getApproximatePosition()).rejects.toMatchObject({
      name: 'GeolocationError',
      reason: 'denied',
    });
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('falls back to GPS when the low accuracy reading times out', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition
      .mockRejectedValueOnce(Object.assign(new Error('Could not obtain location in time.'), { code: 'OS-PLUG-GLOC-0010' }))
      .mockResolvedValueOnce(fix);

    await expect(getApproximatePosition()).resolves.toEqual({ latitude: 1.2136, longitude: -77.2811 });
    expect(mocks.getCurrentPosition).toHaveBeenNthCalledWith(1, LOW_ACCURACY);
    expect(mocks.getCurrentPosition).toHaveBeenNthCalledWith(2, HIGH_ACCURACY);
  });

  it('does not try GPS when only approximate location was granted', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockRejectedValueOnce(
      Object.assign(new Error('Could not obtain location in time.'), { code: 'OS-PLUG-GLOC-0010' }),
    );

    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'timeout' });
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('does not try GPS when the phone location is off', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockRejectedValueOnce(
      Object.assign(new Error('Location services are not enabled.'), { code: 'OS-PLUG-GLOC-0007' }),
    );

    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'disabled' });
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe('GPS fallback', () => {
  const plugin = (code: string) => Object.assign(new Error(code), { code });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
  });

  it('also tries GPS after a vague first failure', async () => {
    mocks.getCurrentPosition.mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0002')).mockResolvedValueOnce(fix);
    await expect(getApproximatePosition()).resolves.toEqual({ latitude: 1.2136, longitude: -77.2811 });
    expect(mocks.getCurrentPosition).toHaveBeenNthCalledWith(2, HIGH_ACCURACY);
  });

  it('tries GPS when only network location is off', async () => {
    mocks.getCurrentPosition.mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0017')).mockResolvedValueOnce(fix);
    await expect(getApproximatePosition()).resolves.toEqual({ latitude: 1.2136, longitude: -77.2811 });
  });

  it('keeps the timeout advice when GPS then fails vaguely', async () => {
    mocks.getCurrentPosition
      .mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0010'))
      .mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0002'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'timeout' });
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('reports the GPS failure when both readings time out', async () => {
    mocks.getCurrentPosition
      .mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0010'))
      .mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0010'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('stops at a refused permission or a dismissed "turn on location" dialog', async () => {
    mocks.getCurrentPosition.mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0003'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'denied' });
    mocks.getCurrentPosition.mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0009'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'disabled' });
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('reads "location off" from checkPermissions too', async () => {
    mocks.checkPermissions.mockRejectedValueOnce(plugin('OS-PLUG-GLOC-0007'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'disabled' });
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('never matches inherited object keys as plugin codes', () => {
    expect(classifyGeolocationFailure({ code: 'toString' })).toBe('unavailable');
  });
});

describe('classifyGeolocationFailure', () => {
  it.each([
    ['OS-PLUG-GLOC-0003', 'denied'],
    ['OS-PLUG-GLOC-0007', 'disabled'],
    // Dismissing the "turn on location" dialog is not a refused permission
    ['OS-PLUG-GLOC-0009', 'disabled'],
    ['OS-PLUG-GLOC-0017', 'disabled'],
    ['OS-PLUG-GLOC-0010', 'timeout'],
    ['OS-PLUG-GLOC-0002', 'unavailable'],
  ])('maps the plugin code %s to %s', (code, reason) => {
    expect(classifyGeolocationFailure(Object.assign(new Error('x'), { code }))).toBe(reason);
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ])('maps the browser code %s to %s', (code, reason) => {
    expect(classifyGeolocationFailure({ code, message: 'x' })).toBe(reason);
  });

  it('treats an unknown error as unavailable', () => {
    expect(classifyGeolocationFailure(new Error('boom'))).toBe('unavailable');
    expect(classifyGeolocationFailure(null)).toBe('unavailable');
  });

  it('wraps the failure in a GeolocationError on the web', async () => {
    vi.resetAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.getCurrentPosition.mockRejectedValue({ code: 1, message: 'User denied Geolocation' });
    const error = await getApproximatePosition().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GeolocationError);
    expect((error as GeolocationError).reason).toBe('denied');
  });
});
