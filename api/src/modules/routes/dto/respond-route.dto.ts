import { z } from 'zod';

export const ROUTE_DECISIONS = ['ACCEPTED', 'REJECTED'] as const;

export type RouteDecision = (typeof ROUTE_DECISIONS)[number];

export const respondRouteSchema = z
  .object({
    decision: z.enum(ROUTE_DECISIONS, {
      errorMap: () => ({
        message: 'decision must be either ACCEPTED or REJECTED',
      }),
    }),
    comment: z
      .string()
      .trim()
      .max(500, 'comment must be at most 500 characters long')
      .optional(),
  })
  .strict();

export type RespondRouteDto = z.infer<typeof respondRouteSchema>;
