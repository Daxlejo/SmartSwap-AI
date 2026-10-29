import { z } from 'zod';

export const queryMunicipalitiesSchema = z.object({
  department: z
    .string()
    .trim()
    .regex(/^\d{2}$/, 'department must be a 2-digit DANE code')
    .optional(),
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(1200).optional(),
});

export type QueryMunicipalitiesDto = z.infer<typeof queryMunicipalitiesSchema>;

/** Bounding box of Colombia (San Andrés to Leticia); rejects GPS fixes from elsewhere. */
export const resolveLocationSchema = z.object({
  lat: z.coerce
    .number()
    .min(-5, 'Location is outside Colombia')
    .max(14, 'Location is outside Colombia'),
  lon: z.coerce
    .number()
    .min(-82, 'Location is outside Colombia')
    .max(-66, 'Location is outside Colombia'),
});

export type ResolveLocationDto = z.infer<typeof resolveLocationSchema>;
