import { z } from 'zod';

// Single source of truth for every env var the API reads. Validated once at
// boot (ConfigModule.forRoot({ validate }) in app.module.ts) so a missing or
// malformed value crashes startup with a clear message instead of surfacing
// later as a confusing runtime failure (or worse, a silent insecure default).
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // HS256 key. 32+ chars = 256 bits minimum; generate with:
  //   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().min(1).default('investment-platform-api'),
  JWT_AUDIENCE: z.string().min(1).default('investment-platform-secure-web'),

  // Access token: short, because it can't be revoked cheaply except via the
  // jti blacklist / tokenVersion (both checked on every request anyway).
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  // Refresh token lifetime is ABSOLUTE per login — rotation doesn't extend
  // it. Admins get a much shorter session than investors (stack decision).
  INVESTOR_SESSION_TTL_HOURS: z.coerce.number().int().min(1).default(24 * 7),
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8),

  // Comma-separated exact origins of secure-web, e.g.
  // "https://app.example.com,http://localhost:3001". Used for CORS and for
  // the Origin check on state-changing requests (CSRF defence).
  CORS_ORIGINS: z
    .string()
    .min(1, 'CORS_ORIGINS is required (comma-separated secure-web origins)')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url('CORS_ORIGINS entries must be full origins'))),

  // Optional cookie Domain attribute. Leave unset when secure-web proxies
  // /api to this server on the same host (host-only cookie is strictest).
  COOKIE_DOMAIN: z.string().min(1).optional(),

  // Number of reverse proxies in front of the API (nginx = 1). Required for
  // req.ip to be the real client IP, which the admin IP allowlist and rate
  // limiting depend on. 0 = connect directly (dev).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

  // Transactional email via Resend (password reset, admin invites).
  // Optional outside production: without a key, MailService logs the link
  // to the console instead of sending, so local dev works with no account.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Must be on a domain verified in Resend, e.g. "Platform <no-reply@example.com>".
  MAIL_FROM: z.string().min(3).optional(),
  // Public base URL of secure-web; emailed links point at its
  // /reset-password and /set-password pages. Defaults to the first
  // CORS_ORIGINS entry outside production.
  APP_URL: z.string().url('APP_URL must be a full URL').optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  for (const key of ['RESEND_API_KEY', 'MAIL_FROM', 'APP_URL'] as const) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
