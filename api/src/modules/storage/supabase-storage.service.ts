import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

const BUCKET_NAME = 'item-images';

export const ITEM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadImageOptions {
  /** Object path prefix inside the bucket, e.g. "avatars". Defaults to the user folder only. */
  folder?: string;
  /** Maximum decoded size in bytes. */
  maxBytes?: number;
}

@Injectable()
export class SupabaseStorageService {
  async uploadBase64Image(
    userId: string,
    base64DataUrl: string,
    mimeType?: string,
    options: UploadImageOptions = {},
  ): Promise<{ url: string }> {
    const { buffer, resolvedMimeType, extension } = this.parseBase64Payload(
      base64DataUrl,
      mimeType,
      options.maxBytes ?? ITEM_IMAGE_MAX_BYTES,
    );

    const rawSupabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rawSupabaseUrl || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        'Image storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
      );
    }
    const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '');

    const prefix = options.folder ? `${options.folder}/` : '';
    const objectPath = `${prefix}${userId}/${randomUUID()}.${extension}`;
    const uploadEndpoint = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${objectPath}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${objectPath}`;

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': resolvedMimeType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(buffer),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new InternalServerErrorException(
          `Supabase Storage upload failed (${response.status}): ${errorBody}`,
        );
      }

      return { url: publicUrl };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to upload image to Supabase Storage: ${(error as Error).message}`,
      );
    }
  }

  private parseBase64Payload(
    base64DataUrl: string,
    explicitMimeType: string | undefined,
    maxBytes: number,
  ): {
    buffer: Buffer;
    resolvedMimeType: string;
    extension: string;
  } {
    if (!base64DataUrl || typeof base64DataUrl !== 'string') {
      throw new BadRequestException('Image payload must be a non-empty string');
    }

    const trimmed = base64DataUrl.trim();
    const dataUrlRegex = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s;
    const match = dataUrlRegex.exec(trimmed);

    let resolvedMimeType = explicitMimeType?.trim().toLowerCase();
    let rawBase64 = trimmed;

    if (match) {
      resolvedMimeType = match[1].toLowerCase();
      rawBase64 = match[2];
    } else if (!resolvedMimeType) {
      throw new BadRequestException(
        'Invalid base64 image format. Expected data:image/(jpeg|png|webp);base64,...',
      );
    }

    const extension = resolvedMimeType
      ? MIME_TO_EXT[resolvedMimeType]
      : undefined;

    if (!resolvedMimeType || !extension) {
      throw new BadRequestException(
        `Unsupported image MIME type "${resolvedMimeType ?? 'unknown'}". Allowed: image/jpeg, image/png, image/webp`,
      );
    }

    const cleanedBase64 = rawBase64.replace(/\s+/g, '');
    if (
      cleanedBase64.length === 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanedBase64)
    ) {
      throw new BadRequestException('Malformed base64 image data');
    }

    const buffer = Buffer.from(cleanedBase64, 'base64');
    if (buffer.byteLength === 0) {
      throw new BadRequestException('Decoded image buffer is empty');
    }
    if (buffer.byteLength > maxBytes) {
      throw new PayloadTooLargeException(
        `Image exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit`,
      );
    }
    if (!matchesImageSignature(buffer, extension)) {
      throw new BadRequestException(
        `Image content does not match the declared type "${resolvedMimeType}"`,
      );
    }

    return {
      buffer,
      resolvedMimeType,
      extension,
    };
  }
}

/** Checks the file magic bytes so a renamed non-image cannot be stored as a picture. */
function matchesImageSignature(buffer: Buffer, extension: string): boolean {
  switch (extension) {
    case 'jpg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'png':
      return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case 'webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
}
