import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  takePhoto: vi.fn(),
  chooseFromGallery: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform, convertFileSrc: (uri: string) => `local:${uri}` },
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    takePhoto: mocks.takePhoto,
    chooseFromGallery: mocks.chooseFromGallery,
  },
  MediaTypeSelection: { Photo: 0 },
  CameraErrorCode: {
    CameraPermissionDenied: 'OS-PLUG-CAMR-0003',
    GalleryPermissionDenied: 'OS-PLUG-CAMR-0005',
    TakePhotoCancelled: 'OS-PLUG-CAMR-0006',
    ChooseMediaCancelled: 'OS-PLUG-CAMR-0020',
    NoCameraAvailable: 'OS-PLUG-CAMR-0007',
  },
}));

import { PhotoPickError, classifyPhotoFailure, pickPhotos } from '@/services/media/photoPicker';

const photo = (n: number) => ({ type: 0, saved: false, webPath: `http://localhost/_capacitor_file_/p${n}.jpg` });

describe('pickPhotos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isNativePlatform.mockReturnValue(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['jpeg'], { type: 'image/jpeg' }))),
    );
  });

  it('asks for the camera permission before opening the camera', async () => {
    mocks.checkPermissions.mockResolvedValue({ camera: 'prompt', photos: 'granted' });
    mocks.requestPermissions.mockResolvedValue({ camera: 'granted', photos: 'granted' });
    mocks.takePhoto.mockResolvedValue(photo(1));

    const files = await pickPhotos('camera', 4);

    expect(files).toHaveLength(1);
    expect(files[0].type).toBe('image/jpeg');
    expect(mocks.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
    expect(mocks.requestPermissions.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.takePhoto.mock.invocationCallOrder[0],
    );
  });

  it('reports a refused camera permission without opening the camera', async () => {
    mocks.checkPermissions.mockResolvedValue({ camera: 'prompt', photos: 'granted' });
    mocks.requestPermissions.mockResolvedValue({ camera: 'denied', photos: 'granted' });

    await expect(pickPhotos('camera', 1)).rejects.toMatchObject({ name: 'PhotoPickError', reason: 'denied' });
    expect(mocks.takePhoto).not.toHaveBeenCalled();
  });

  it('lets the person choose several photos from the gallery, up to the free slots', async () => {
    mocks.chooseFromGallery.mockResolvedValue({ results: [photo(1), photo(2), photo(3)] });

    const files = await pickPhotos('gallery', 2);

    expect(files).toHaveLength(2);
    expect(mocks.chooseFromGallery).toHaveBeenCalledWith(
      expect.objectContaining({ allowMultipleSelection: true, limit: 2 }),
    );
    // The system photo picker needs no permission
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it('picks a single photo when only one slot is left', async () => {
    mocks.chooseFromGallery.mockResolvedValue({ results: [photo(1)] });
    await pickPhotos('gallery', 1);
    expect(mocks.chooseFromGallery).toHaveBeenCalledWith(expect.objectContaining({ allowMultipleSelection: false }));
  });

  it('turns a closed picker into a cancelled pick', async () => {
    mocks.chooseFromGallery.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'OS-PLUG-CAMR-0020' }));
    const error = await pickPhotos('gallery', 4).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PhotoPickError);
    expect((error as PhotoPickError).reason).toBe('cancelled');
  });

  it('fails when the picked file cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    mocks.chooseFromGallery.mockResolvedValue({ results: [photo(1)] });
    await expect(pickPhotos('gallery', 4)).rejects.toMatchObject({ reason: 'failed' });
  });
});

describe('classifyPhotoFailure', () => {
  it.each([
    ['OS-PLUG-CAMR-0003', 'denied'],
    ['OS-PLUG-CAMR-0006', 'cancelled'],
    ['OS-PLUG-CAMR-0020', 'cancelled'],
    ['OS-PLUG-CAMR-0007', 'noCamera'],
    ['OS-PLUG-CAMR-0010', 'failed'],
  ])('maps %s to %s', (code, reason) => {
    expect(classifyPhotoFailure({ code })).toBe(reason);
  });
});
