import { z } from 'zod';

export const uploadImageSchema = z
  .object({
    imageBase64: z
      .string()
      .trim()
      .min(1, 'imageBase64 is required'),
    mimeType: z.string().trim().optional(),
  })
  .strict();

export type UploadImageDto = z.infer<typeof uploadImageSchema>;
