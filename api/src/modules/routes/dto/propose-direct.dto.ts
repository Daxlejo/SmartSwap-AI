import { z } from 'zod';

/**
 * A 1-to-1 proposal: the initiator offers one of their items for one item of another
 * user. Their wants are not checked; it is an offer and the owner decides.
 */
export const proposeDirectSchema = z
  .object({
    offeredItemId: z.string().trim().min(1, 'offeredItemId is required'),
    wantedItemId: z.string().trim().min(1, 'wantedItemId is required'),
  })
  .strict()
  .refine((dto) => dto.offeredItemId !== dto.wantedItemId, {
    message: 'offeredItemId and wantedItemId must be different items',
    path: ['wantedItemId'],
  });

export type ProposeDirectDto = z.infer<typeof proposeDirectSchema>;
