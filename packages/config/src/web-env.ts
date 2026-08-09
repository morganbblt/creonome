import { z } from "zod";

const WebUrlSchema = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { message: "Expected an HTTP or HTTPS URL" },
);

const WebServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEON_AUTH_BASE_URL: WebUrlSchema,
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  // Browser-visible product analytics. Optional and unset by default -- the
  // analytics wrapper in apps/web/src/lib/analytics degrades to a no-op
  // client when NEXT_PUBLIC_POSTHOG_KEY is absent, so no deployment is
  // required to configure PostHog to run. This schema entry documents and
  // validates the shape; the wrapper itself reads
  // process.env.NEXT_PUBLIC_POSTHOG_KEY directly (a literal expression),
  // which is what lets Next.js inline it into the client bundle.
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: WebUrlSchema.optional(),
});

export type WebServerEnv = z.infer<typeof WebServerEnvSchema>;

export function parseWebServerEnv(
  input: Record<string, unknown>,
): WebServerEnv {
  return WebServerEnvSchema.parse(input);
}
