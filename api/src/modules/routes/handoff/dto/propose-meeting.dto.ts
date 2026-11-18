import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A handoff is agreed for the near future; earlier hours of today are allowed (already met). */
const MAX_DAYS_AHEAD = 60;

export const proposeMeetingSchema = z
  .object({
    at: z
      .string({ required_error: 'at is required' })
      .datetime({ offset: true, message: 'at must be an ISO 8601 date and time' })
      .refine((value) => new Date(value).getTime() >= Date.now() - DAY_MS, {
        message: 'at cannot be more than one day in the past',
      })
      .refine((value) => new Date(value).getTime() <= Date.now() + MAX_DAYS_AHEAD * DAY_MS, {
        message: `at must be within the next ${MAX_DAYS_AHEAD} days`,
      }),
    place: z
      .string({ required_error: 'place is required' })
      .trim()
      .min(3, 'place must be at least 3 characters long')
      .max(160, 'place must be at most 160 characters long'),
  })
  .strict();

export type ProposeMeetingDto = z.infer<typeof proposeMeetingSchema>;
