import { z } from 'zod';
import { aiLocaleSchema, DEFAULT_AI_LOCALE } from './ai-locale.dto';

export const analyzePhotoSchema = z
  .object({
    imageBase64: z.string().trim().min(1).optional(),
    hintText: z.string().trim().max(300).optional(),
    locale: aiLocaleSchema.optional().default(DEFAULT_AI_LOCALE),
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
