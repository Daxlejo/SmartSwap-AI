import { z } from 'zod';

export const uploadImageSchema = z
  .object({
    imageBase64: z.string().trim().min(1).optional(),
    image: z.string().trim().min(1).optional(),
    dataUrl: z.string().trim().min(1).optional(),
    base64: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.imageBase64 || data.image || data.dataUrl || data.base64,
      ),
    {
      message: 'imageBase64 is required',
      path: ['imageBase64'],
    },
  )
  .transform((data) => ({
    imageBase64: (
      data.imageBase64 ||
      data.image ||
      data.dataUrl ||
      data.base64 ||
      ''
    ).trim(),
    mimeType: data.mimeType,
  }));

export type UploadImageDto = z.infer<typeof uploadImageSchema>;
