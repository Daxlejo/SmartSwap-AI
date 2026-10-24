import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Must be a valid email address')
      .transform((val) => val.toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long'),
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long'),
    location: z.string().trim().optional(),
  })
  .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
