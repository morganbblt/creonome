import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { resolveAuthServerConfig } from "./server-config";

let authInstance: ReturnType<typeof createNeonAuth> | undefined;

/**
 * Resolve Neon Auth on the first request instead of at module evaluation.
 * This keeps `next build` independent from runtime secrets while preserving
 * strict validation as soon as an authentication path is used.
 */
export function getAuth(): ReturnType<typeof createNeonAuth> {
  authInstance ??= createNeonAuth(resolveAuthServerConfig(process.env));
  return authInstance;
}
