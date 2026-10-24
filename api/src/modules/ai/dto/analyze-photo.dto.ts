import { z } from 'zod';

export const analyzePhotoSchema = z
  .object({
    imageBase64: z.string().trim().min(1).optional(),
    hintText: z.string().trim().max(300).optional(),
    locale: z.enum(['es', 'en']).optional().default('es'),
  })
  .refine(
    (data) =>
      Boolean(
        (data.imageBase64 && data.imageBase64.length > 0) ||
          (data.hintText && data.hintText.length > 0),
      ),
    {
      message: 'At least one of imageBase64 or hintText must be provided',
      path: ['imageBase64'],
    },
  );

export type AnalyzePhotoDto = z.infer<typeof analyzePhotoSchema>;
