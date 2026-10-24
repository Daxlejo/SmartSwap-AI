import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Must be a valid email address')
      .transform((val) => val.toLowerCase()),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;
