import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default(
      'postgresql://postgres:postgres@localhost:5432/smartswap?schema=public',
    ),
  DIRECT_URL: z
    .string()
    .min(1, 'DIRECT_URL is required')
    .default(
      'postgresql://postgres:postgres@localhost:5432/smartswap?schema=public',
    ),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('super-secret-jwt-key-for-dev-change-in-prod-min-32-chars'),
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .default('sk-mock-openai-api-key-for-development'),
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .default('https://smartswap-mock.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .default('mock-supabase-service-role-key-for-local-development'),
  CORS_ORIGIN: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `${err.path.join('.') || 'root'}: ${err.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${formattedErrors}`);
  }

  return result.data;
}
