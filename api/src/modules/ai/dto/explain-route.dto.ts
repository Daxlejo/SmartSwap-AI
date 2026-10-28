import { z } from 'zod';
import { aiLocaleSchema } from './ai-locale.dto';

export const routeStepExplanationSchema = z.object({
  userName: z.string().trim().min(1, 'userName is required'),
  givesItemName: z.string().trim().min(1, 'givesItemName is required'),
  givesItemValue: z.coerce
    .number()
    .nonnegative('givesItemValue must be non-negative'),
  receivesItemName: z.string().trim().min(1, 'receivesItemName is required'),
  receivesItemValue: z.coerce
    .number()
    .nonnegative('receivesItemValue must be non-negative'),
});

export const explainRouteSchema = z.object({
  objectiveText: z
    .string()
    .trim()
    .min(1, 'objectiveText is required')
    .max(300, 'objectiveText must be at most 300 characters long'),
  steps: z
    .array(routeStepExplanationSchema)
    .min(1, 'At least one swap step is required')
    .max(10, 'At most 10 swap steps are allowed'),
  locale: aiLocaleSchema.optional(),
});

export type RouteStepExplanationInput = z.infer<
  typeof routeStepExplanationSchema
>;
export type ExplainRouteDto = z.infer<typeof explainRouteSchema>;
