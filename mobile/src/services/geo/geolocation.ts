import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus, type PositionOptions } from '@capacitor/geolocation';

/**
 * Why a position could not be read:
 * - `denied`: the location permission was refused (or refused for good).
 * - `disabled`: the phone's location is off, or the person dismissed the system
 *   dialog that asks to turn it on.
 * - `timeout`: no fix arrived in time (indoors, no Wi-Fi, no GPS signal).
 * - `unavailable`: anything else (no Google Play Services, hardware error).
 */
export type GeolocationFailure = 'denied' | 'disabled' | 'unavailable' | 'timeout';

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

/**
 * Error codes of @capacitor/geolocation 8 on Android (GeolocationErrors.kt). The
 * plugin rejects with these string codes, never with the numeric codes of the
 * browser API, so classifying by message text mislabelled them: "Request to
 * enable location was denied" read as a refused permission and "Could not obtain
 * location in time" was not recognised as a timeout.
 */
const PLUGIN_FAILURES: Readonly<Record<string, GeolocationFailure>> = {
  'OS-PLUG-GLOC-0003': 'denied', // permission request denied
  'OS-PLUG-GLOC-0007': 'disabled', // location services are not enabled
  'OS-PLUG-GLOC-0009': 'disabled', // the "turn on location" dialog was dismissed
  'OS-PLUG-GLOC-0016': 'disabled', // location settings error
  'OS-PLUG-GLOC-0017': 'disabled', // network and location both off
  'OS-PLUG-GLOC-0010': 'timeout', // could not obtain location in time
};

/** Browser `GeolocationPositionError` codes. */
const BROWSER_FAILURES: Readonly<Record<number, GeolocationFailure>> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
};

export const classifyGeolocationFailure = (error: unknown): GeolocationFailure => {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code in PLUGIN_FAILURES) return PLUGIN_FAILURES[code];
  if (typeof code === 'number' && code in BROWSER_FAILURES) return BROWSER_FAILURES[code];
  return 'unavailable';
};

/** Quick first try: Wi-Fi and cell towers, or a fix from the last 10 minutes. */
export const LOW_ACCURACY: PositionOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 };
/** Fallback: GPS, which works without network location but needs more time. */
export const HIGH_ACCURACY: PositionOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

const read = async (options: PositionOptions): Promise<Coordinates> => {
  const position = await Geolocation.getCurrentPosition(options);
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
};

/** The failure is logged with its native code so `adb logcat` shows what really happened. */
const fail = (error: unknown, attempt: string): GeolocationError => {
  const reason = classifyGeolocationFailure(error);
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[geolocation] ${attempt} failed: ${String(code ?? 'no code')} ${message} -> ${reason}`);
  return new GeolocationError(reason, message);
};

/**
 * On Android asks for location (the person may grant only "approximate") and returns
 * the resulting state. Order matters: permissions are settled before reading the
 * position, so the plugin never prompts in the middle of a read.
 */
const ensurePermission = async (): Promise<PermissionStatus> => {
  const current = await Geolocation.checkPermissions();
  if (current.coarseLocation === 'granted') return current;
  const requested = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
  if (requested.coarseLocation !== 'granted') throw new GeolocationError('denied');
  return requested;
};

/**
 * Reads an approximate position (municipality-level accuracy is enough). Tries
 * low accuracy first and, when it times out or finds nothing, GPS. On Android
 * 12+ GPS needs the precise permission, so it is only tried when granted; asking
 * for it again would show the permission dialog a second time.
 */
export const getApproximatePosition = async (): Promise<Coordinates> => {
  let preciseAllowed = true;
  if (Capacitor.isNativePlatform()) {
    try {
      preciseAllowed = (await ensurePermission()).location === 'granted';
    } catch (error) {
      if (error instanceof GeolocationError) throw error;
      throw fail(error, 'permission');
    }
  }

  let first: GeolocationError;
  try {
    return await read(LOW_ACCURACY);
  } catch (error) {
    first = fail(error, 'low accuracy');
  }
  // A refused permission or a switched-off location will not fix itself with GPS
  if (first.reason === 'denied' || first.reason === 'disabled' || !preciseAllowed) throw first;

  try {
    return await read(HIGH_ACCURACY);
  } catch (error) {
    throw fail(error, 'high accuracy');
  }
};
