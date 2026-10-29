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

import { GeolocationError, getApproximatePosition } from '@/services/geo/geolocation';

const fix = { coords: { latitude: 1.2136, longitude: -77.2811 } };

describe('getApproximatePosition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('asks for coarse location on a native device before reading the position', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(fix);

    await getApproximatePosition();

    expect(mocks.requestPermissions).toHaveBeenCalledWith({ permissions: ['coarseLocation'] });
  });

  it('does not ask again when the permission was already granted', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    mocks.getCurrentPosition.mockResolvedValue(fix);

    await getApproximatePosition();

    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('reports a denied permission', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });

    await expect(getApproximatePosition()).rejects.toMatchObject({
      name: 'GeolocationError',
      reason: 'denied',
    });
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('classifies browser and plugin errors', async () => {
    mocks.getCurrentPosition.mockRejectedValueOnce(new Error('User denied Geolocation'));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'denied' });

    mocks.getCurrentPosition.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 3 }));
    await expect(getApproximatePosition()).rejects.toMatchObject({ reason: 'timeout' });

    mocks.getCurrentPosition.mockRejectedValueOnce(new Error('Location services are disabled'));
    const error = await getApproximatePosition().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GeolocationError);
    expect((error as GeolocationError).reason).toBe('unavailable');
  });
});
