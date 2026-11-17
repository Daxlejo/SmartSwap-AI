import { z } from 'zod';

/** Whole pesos from the query string; an empty value (`?maxPrice=`) means no limit, not 0. */
const priceParam = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

export const queryItemsSchema = z.object({
  search: z.string().trim().optional(),
  query: z.string().trim().optional(),
  category: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  /** Leaves out one user's items (the viewer's own, so Explore shows only what they can ask for). */
  excludeOwnerId: z.string().trim().min(1).optional(),
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
  /** Price range in whole Colombian pesos (COP), both ends inclusive. */
  minPrice: priceParam,
  maxPrice: priceParam,
}).refine(
  (query) =>
    query.minPrice === undefined ||
    query.maxPrice === undefined ||
    query.minPrice <= query.maxPrice,
  { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] },
);

export type QueryItemsDto = z.infer<typeof queryItemsSchema>;
