import { z } from 'zod';

export const proposeRouteStepSchema = z
  .object({
    stepOrder: z.coerce
      .number()
      .int('stepOrder must be an integer')
      .min(0, 'stepOrder must be at least 0')
      .max(10, 'stepOrder must be at most 10'),
    userId: z
      .string()
      .trim()
      .min(1, 'userId is required'),
    givesItemId: z
      .string()
      .trim()
      .min(1, 'givesItemId is required'),
    receivesItemId: z
      .string()
      .trim()
      .min(1, 'receivesItemId is required'),
  })
  .strict();

export const proposeRouteSchema = z
  .object({
    objectiveText: z
      .string()
      .trim()
      .min(2, 'objectiveText must be at least 2 characters long')
      .max(200, 'objectiveText must be at most 200 characters long'),
    matchScore: z.coerce
      .number()
      .min(0, 'matchScore must be at least 0')
      .max(100, 'matchScore must be at most 100'),
    aiExplanation: z
      .string()
      .trim()
      .max(2000, 'aiExplanation must be at most 2000 characters long')
      .optional(),
    steps: z
      .array(proposeRouteStepSchema)
      .min(2, 'A swap route must contain at least 2 steps')
      .max(4, 'A swap route must contain at most 4 steps'),
  })
  .strict();

export type ProposeRouteStepDto = z.infer<typeof proposeRouteStepSchema>;
export type ProposeRouteDto = z.infer<typeof proposeRouteSchema>;
