import { z } from 'zod';

export const uploadAvatarSchema = z.object({
  imageBase64: z.string().trim().min(1, 'imageBase64 is required'),
  mimeType: z.string().trim().optional(),
});

export type UploadAvatarDto = z.infer<typeof uploadAvatarSchema>;
