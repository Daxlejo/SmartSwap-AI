import { z } from 'zod';

export const queryNotificationsSchema = z.object({
  unreadOnly: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      return val;
    }, z.boolean().optional())
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type QueryNotificationsDto = z.infer<typeof queryNotificationsSchema>;
