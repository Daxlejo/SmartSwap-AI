import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type GeolocationFailure = 'denied' | 'unavailable' | 'timeout';

export class GeolocationError extends Error {
  public readonly reason: GeolocationFailure;

  constructor(reason: GeolocationFailure, message?: string) {
    super(message ?? reason);
    this.name = 'GeolocationError';
    this.reason = reason;
    Object.setPrototypeOf(this, GeolocationError.prototype);
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const classifyFailure = (error: unknown): GeolocationFailure => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = (error as { code?: number } | null)?.code;

  if (code === 1 || message.includes('denied') || message.includes('permission')) return 'denied';
  if (code === 3 || message.includes('timeout') || message.includes('timed out')) return 'timeout';
  return 'unavailable';
};

/**
 * Reads an approximate position (municipality-level accuracy is enough, so only coarse location
 * is requested). Works with the Capacitor plugin on Android/iOS and with the browser API on the web.
 */
export const getApproximatePosition = async (): Promise<Coordinates> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.checkPermissions();
      if (status.coarseLocation !== 'granted' && status.location !== 'granted') {
        const requested = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] });
        if (requested.coarseLocation !== 'granted' && requested.location !== 'granted') {
          throw new GeolocationError('denied');
        }
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (error) {
    if (error instanceof GeolocationError) throw error;
    throw new GeolocationError(classifyFailure(error));
  }
};
