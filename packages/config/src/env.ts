import { z } from 'zod';

/**
 * Centralised, validated environment configuration.
 *
 * The whole platform reads its configuration through this module so that a
 * missing or malformed variable fails fast at boot with a readable error,
 * instead of surfacing as a mysterious runtime bug deep inside a request.
 */
const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('dev-only-change-me-please-32chars-minimum-secret'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

export type ServerEnv = z.infer<typeof serverSchema> & { isProd: boolean; isDev: boolean };

let cached: ServerEnv | null = null;

/** Parse and cache the server environment. Throws a readable error if invalid. */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && env.SESSION_SECRET.startsWith('dev-only')) {
    throw new Error('SESSION_SECRET must be set to a strong random value in production.');
  }
  cached = { ...env, isProd: env.NODE_ENV === 'production', isDev: env.NODE_ENV === 'development' };
  return cached;
}

export { booleanish };
