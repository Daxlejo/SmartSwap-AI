import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must be at most 100 characters long')
      .optional(),
    location: z
      .string()
      .trim()
      .max(120, 'Location must be at most 120 characters long')
      .optional(),
    avatarUrl: z
      .string()
      .trim()
      .url('avatarUrl must be a valid URL')
      .optional(),
  })
  .strict();

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
