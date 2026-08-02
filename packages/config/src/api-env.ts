import { z } from "zod";

const CorsOriginsSchema = z
  .string()
  .default("http://localhost:3000")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).min(1));

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const OptionalSecretSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

const OptionalHttpUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol))
    .optional(),
);

const OptionalPostgresUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .refine(
      (value) =>
        value.startsWith("postgres://") || value.startsWith("postgresql://"),
      { message: "Expected a postgres:// or postgresql:// URL" },
    )
    .optional(),
);

const booleanEnvironmentSchema = (defaultValue = false) =>
  z
    .enum(["true", "false", "1", "0"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true" || value === "1");

const ApiEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  API_PREFIX: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/)
    .default("api"),
  CORS_ALLOWED_ORIGINS: CorsOriginsSchema,
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  DATABASE_URL: OptionalPostgresUrlSchema,
  NEON_AUTH_JWKS_URL: OptionalHttpUrlSchema,
  GEMINI_API_KEY: OptionalSecretSchema,
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  MEM0_API_KEY: OptionalSecretSchema,
  MEM0_BASE_URL: z.url().default("https://api.mem0.ai"),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).default("creonome"),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default("global"),
  VERTEX_AI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  VIDEO_PROVIDER: z.enum(["auto", "veo", "deterministic"]).default("auto"),
  VEO_MODEL: z.string().min(1).default("veo-3.1-fast-generate-preview"),
  VEO_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(10_000),
  VEO_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .max(300_000)
    .default(240_000),
  GCP_MEDIA_BUCKET: z.string().min(3).optional(),
  TIKTOK_CLIENT_KEY: OptionalSecretSchema,
  TIKTOK_CLIENT_SECRET: OptionalSecretSchema,
  TIKTOK_REDIRECT_URI: OptionalHttpUrlSchema,
  META_APP_ID: OptionalSecretSchema,
  META_APP_SECRET: OptionalSecretSchema,
  META_REDIRECT_URI: OptionalHttpUrlSchema,
  SOCIAL_OAUTH_ENCRYPTION_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(32).optional(),
  ),
  FEATURE_SOCIAL_CONNECTIONS: booleanEnvironmentSchema(),
  DEMO_MODE: booleanEnvironmentSchema(true),
  DEMO_WORKSPACE_SLUG: z.string().min(1).default("nova-sainte"),
  DEFAULT_CREDIT_BALANCE: z.coerce.number().int().min(0).default(60),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function parseApiEnv(input: Record<string, unknown>): ApiEnv {
  return ApiEnvSchema.parse(input);
}
