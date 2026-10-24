import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

const BUCKET_NAME = 'item-images';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class SupabaseStorageService {
  async uploadBase64Image(
    userId: string,
    base64DataUrl: string,
    mimeType?: string,
  ): Promise<{ url: string }> {
    const supabaseUrl = (
      process.env.SUPABASE_URL ?? 'https://smartswap-mock.supabase.co'
    ).replace(/\/+$/, '');
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      'mock-supabase-service-role-key-for-local-development';

    const { buffer, resolvedMimeType, extension } = this.parseBase64Payload(
      base64DataUrl,
      mimeType,
    );

    const objectPath = `${userId}/${randomUUID()}.${extension}`;
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
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to upload image to Supabase Storage: ${(error as Error).message}`,
      );
    }
  }

  private parseBase64Payload(
    base64DataUrl: string,
    explicitMimeType?: string,
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
      rawBase4Check(match[2]);
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

    return {
      buffer,
      resolvedMimeType,
      extension,
    };
  }
}

function rawBase4Check(payload: string): void {
  if (!payload || payload.trim().length === 0) {
    throw new BadRequestException('Base64 payload content is empty');
  }
}
