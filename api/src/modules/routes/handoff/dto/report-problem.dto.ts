import { z } from 'zod';

export const reportProblemSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(500, 'reason must be at most 500 characters long')
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .strict();

export type ReportProblemDto = z.infer<typeof reportProblemSchema>;
