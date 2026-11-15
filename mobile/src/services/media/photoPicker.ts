import { Capacitor } from '@capacitor/core';
import { Camera, CameraErrorCode, MediaTypeSelection, type MediaResult } from '@capacitor/camera';

/** Where a photo comes from. */
export type PhotoSource = 'camera' | 'gallery';

/**
 * - `denied`: the camera permission was refused; the person has to allow it in Settings.
 * - `galleryDenied`: access to photos was refused (only Android 9 and older ask for it).
 * - `cancelled`: the person closed the camera or the gallery without choosing (not an error).
 * - `noCamera`: the device has no camera.
 * - `failed`: the photo could not be read.
 */
export type PhotoPickFailure = 'denied' | 'galleryDenied' | 'cancelled' | 'noCamera' | 'failed';

/** Failures the person fixes in the app's Android settings. */
export const isPermissionFailure = (reason: PhotoPickFailure): boolean =>
  reason === 'denied' || reason === 'galleryDenied';

export class PhotoPickError extends Error {
  public readonly reason: PhotoPickFailure;

  constructor(reason: PhotoPickFailure, message?: string) {
    super(message ?? reason);
    this.name = 'PhotoPickError';
    this.reason = reason;
    Object.setPrototypeOf(this, PhotoPickError.prototype);
  }
}

const FAILURES: Readonly<Record<string, PhotoPickFailure>> = {
  [CameraErrorCode.CameraPermissionDenied]: 'denied',
  [CameraErrorCode.GalleryPermissionDenied]: 'galleryDenied',
  [CameraErrorCode.TakePhotoCancelled]: 'cancelled',
  [CameraErrorCode.ChooseMediaCancelled]: 'cancelled',
  [CameraErrorCode.NoCameraAvailable]: 'noCamera',
};

export const classifyPhotoFailure = (error: unknown): PhotoPickFailure => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(FAILURES, code) ? FAILURES[code] : 'failed';
};

/**
 * True when photos come from the native camera and the system photo picker (the
 * Android app). In the browser the caller opens an `<input type="file">` instead.
 */
export const usesNativePicker = (): boolean => Capacitor.isNativePlatform();

/**
 * Settles the camera permission before opening the camera, so the reason for a
 * refusal can be explained. The gallery uses the system photo picker, which
 * needs no permission on Android 10 and later.
 */
const ensureCameraPermission = async (): Promise<void> => {
  const current = await Camera.checkPermissions();
  if (current.camera === 'granted') return;
  const requested = await Camera.requestPermissions({ permissions: ['camera'] });
  if (requested.camera !== 'granted') throw new PhotoPickError('denied');
};

/** Reads a picked photo from the app's local file server into a File the compressor accepts. */
const toFile = async (media: MediaResult, index: number): Promise<File> => {
  const path = media.webPath ?? (media.uri ? Capacitor.convertFileSrc(media.uri) : null);
  if (!path) throw new PhotoPickError('failed', 'The picked photo has no path');
  // A local file (http://localhost/_capacitor_file_/…), not a network call: apiClient does not apply
  const response = await fetch(path);
  if (!response.ok) throw new PhotoPickError('failed', `Could not read the picked photo (${response.status})`);
  const blob = await response.blob();
  return new File([blob], `foto-${index + 1}.jpg`, { type: blob.type || 'image/jpeg' });
};

/**
 * Takes one photo with the camera, or lets the person choose up to `limit`
 * photos from the gallery. Only for the native app (see `usesNativePicker`).
 */
export const pickPhotos = async (source: PhotoSource, limit: number): Promise<File[]> => {
  if (limit < 1) return [];
  try {
    let media: MediaResult[];
    if (source === 'camera') {
      await ensureCameraPermission();
      media = [await Camera.takePhoto({ quality: 90, correctOrientation: true })];
    } else {
      const { results } = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: limit > 1,
        // Android 12 and older ignore the limit, so the result is trimmed below too
        limit,
        quality: 90,
        correctOrientation: true,
      });
      media = results.slice(0, limit);
    }
    return await Promise.all(media.map(toFile));
  } catch (error) {
    const failure =
      error instanceof PhotoPickError
        ? error
        : new PhotoPickError(classifyPhotoFailure(error), error instanceof Error ? error.message : String(error));
    // The native code reaches `adb logcat`, so a failed photo can be told apart from another
    if (failure.reason !== 'cancelled') {
      const code = (error as { code?: unknown } | null)?.code;
      console.warn(`[photoPicker] ${source} failed: ${String(code ?? 'no code')} ${failure.message} -> ${failure.reason}`);
    }
    throw failure;
  }
};
