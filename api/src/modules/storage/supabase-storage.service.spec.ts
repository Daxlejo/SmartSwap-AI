import {
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const dataUrl = (mime: string, bytes: Buffer): string =>
  `data:${mime};base64,${bytes.toString('base64')}`;

describe('SupabaseStorageService', () => {
  const service = new SupabaseStorageService();
  const originalEnv = { ...process.env };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co/';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    process.env = { ...originalEnv };
  });

  it('uploads a valid JPEG and returns the public URL', async () => {
    const { url } = await service.uploadBase64Image(
      'user-1',
      dataUrl('image/jpeg', JPEG_HEADER),
    );

    expect(url).toMatch(
      /^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/item-images\/user-1\/[0-9a-f-]+\.jpg$/,
    );
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toContain('/storage/v1/object/item-images/user-1/');
    expect(init.headers['Content-Type']).toBe('image/jpeg');
  });

  it('prefixes the object path with the requested folder', async () => {
    const { url } = await service.uploadBase64Image(
      'user-1',
      dataUrl('image/png', PNG_HEADER),
      undefined,
      { folder: 'avatars' },
    );

    expect(url).toContain('/item-images/avatars/user-1/');
    expect(url.endsWith('.png')).toBe(true);
  });

  it('rejects unsupported MIME types', async () => {
    await expect(
      service.uploadBase64Image('u', dataUrl('image/gif', JPEG_HEADER)),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects content that does not match the declared type', async () => {
    await expect(
      service.uploadBase64Image('u', dataUrl('image/png', JPEG_HEADER)),
    ).rejects.toThrow(/does not match/);
  });

  it('rejects malformed base64 and missing data-url prefix without a MIME hint', async () => {
    await expect(
      service.uploadBase64Image('u', 'data:image/jpeg;base64,@@@'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.uploadBase64Image('u', JPEG_HEADER.toString('base64')),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects images over the size limit', async () => {
    const big = Buffer.concat([JPEG_HEADER, Buffer.alloc(1024)]);
    await expect(
      service.uploadBase64Image('u', dataUrl('image/jpeg', big), undefined, {
        maxBytes: 512,
      }),
    ).rejects.toThrow(PayloadTooLargeException);
  });

  it('fails loudly when storage is not configured instead of using a mock host', async () => {
    delete process.env.SUPABASE_URL;
    await expect(
      service.uploadBase64Image('u', dataUrl('image/jpeg', JPEG_HEADER)),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces Supabase errors as 500', async () => {
    fetchMock.mockResolvedValue(new Response('Bucket not found', { status: 404 }));
    await expect(
      service.uploadBase64Image('u', dataUrl('image/jpeg', JPEG_HEADER)),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
