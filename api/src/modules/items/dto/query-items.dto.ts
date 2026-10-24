import { z } from 'zod';

export const queryItemsSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type QueryItemsDto = z.infer<typeof queryItemsSchema>;
