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
});

export type WebServerEnv = z.infer<typeof WebServerEnvSchema>;

export function parseWebServerEnv(
  input: Record<string, unknown>,
): WebServerEnv {
  return WebServerEnvSchema.parse(input);
}
