import { parseWebServerEnv } from "@creonome/config";

export function resolveAuthServerConfig(input: Record<string, unknown>) {
  const env = parseWebServerEnv(input);

  return {
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
      secret: env.NEON_AUTH_COOKIE_SECRET,
      sessionDataTtl: 300,
      sameSite: "lax" as const,
    },
    logLevel: "warn" as const,
  };
}
