import { z } from 'zod';

const SECONDS_PER_UNIT = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** `15m`, `7d`… converted to seconds. */
const duration = z
  .string()
  .regex(/^\d+[smhd]$/, 'expected a duration such as 15m or 7d')
  .transform(
    (value) =>
      Number(value.slice(0, -1)) *
      SECONDS_PER_UNIT[value.slice(-1) as keyof typeof SECONDS_PER_UNIT],
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: duration.default(900),
  JWT_REFRESH_TTL: duration.default(604800),
  COOKIE_DOMAIN: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
