import { z } from 'zod';

export const queryItemsSchema = z.object({
  search: z.string().trim().optional(),
  query: z.string().trim().optional(),
  category: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  /** Viewer location; required for the `nearby` and `department` scopes. */
  municipalityCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'municipalityCode must be a 5-digit DANE code')
    .optional(),
  scope: z.enum(['nearby', 'department', 'country']).optional(),
  radiusKm: z.coerce.number().min(1).max(300).optional(),
});

export type QueryItemsDto = z.infer<typeof queryItemsSchema>;
