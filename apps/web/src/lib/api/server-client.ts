import "server-only";
import { getNeonAccessToken } from "@/src/lib/auth/access-token";
import { resolveApiBaseUrl } from "./api-base-url";
import { CreonomeApiClient } from "./creonome-api.client";

export function createServerApiClient(): CreonomeApiClient {
  return new CreonomeApiClient(
    resolveApiBaseUrl(process.env.API_URL ?? "http://localhost:4000"),
    async () => {
      const token = await getNeonAccessToken();
      if (!token) {
        throw new Error("No Neon JWT is available for the API request");
      }
      return token;
    },
  );
}
