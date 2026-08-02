import "server-only";
import { getAuth } from "./server";

export async function getNeonAccessToken(): Promise<string | null> {
  const auth = getAuth() as unknown as { token: () => Promise<unknown> };
  const result = await auth.token();
  if (!result || typeof result !== "object") return null;

  const { data, error } = result as { data?: unknown; error?: unknown };
  if (error || !data || typeof data !== "object") return null;

  const token = (data as { token?: unknown }).token;
  return typeof token === "string" && token.length > 0 ? token : null;
}
