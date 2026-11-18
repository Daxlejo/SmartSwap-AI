import { z } from 'zod';

export const similarItemsQuerySchema = z.object({
  /** What the user typed; its embedding is compared with the items' embeddings. */
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export type SimilarItemsQueryDto = z.infer<typeof similarItemsQuerySchema>;
