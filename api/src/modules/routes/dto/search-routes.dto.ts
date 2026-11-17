import { z } from 'zod';
import { aiLocaleSchema, DEFAULT_AI_LOCALE } from '../../ai/dto/ai-locale.dto';

export const searchRoutesSchema = z
  .object({
    offeredItemId: z
      .string()
      .trim()
      .min(1, 'offeredItemId cannot be empty when provided')
      .optional(),
    objectiveText: z
      .string()
      .trim()
      .min(2, 'objectiveText must be at least 2 characters long')
      .max(200, 'objectiveText must be at most 200 characters long'),
    desiredCategory: z
      .string()
      .trim()
      .min(1, 'desiredCategory cannot be empty when provided')
      .max(60, 'desiredCategory must be at most 60 characters long')
      .optional(),
    /** Exact item the searcher wants to receive; every returned ring ends with it. */
    wantedItemId: z
      .string()
      .trim()
      .min(1, 'wantedItemId cannot be empty when provided')
      .optional(),
    /** Shortest ring to return (3 skips the 1-to-1 swaps, which are proposed directly); above maxSteps it is capped to it. */
    minSteps: z.coerce
      .number()
      .int('minSteps must be an integer')
      .min(2, 'minSteps must be at least 2')
      .max(4, 'minSteps must be at most 4')
      .default(2),
    maxSteps: z.coerce
      .number()
      .int('maxSteps must be an integer')
      .min(2, 'maxSteps must be at least 2')
      .max(4, 'maxSteps must be at most 4')
      .default(4),
    valueTolerancePct: z.coerce
      .number()
      .min(10, 'valueTolerancePct must be at least 10')
      .max(70, 'valueTolerancePct must be at most 70')
      .default(45),
    locale: aiLocaleSchema.default(DEFAULT_AI_LOCALE),
    /** Where to look for participants, relative to the searcher's registered municipality. */
    scope: z.enum(['nearby', 'department', 'country']).default('country'),
    radiusKm: z.coerce.number().min(1).max(300).optional(),
  })
  .strict();

export type SearchRoutesInput = z.input<typeof searchRoutesSchema>;
export type SearchRoutesDto = z.output<typeof searchRoutesSchema>;
