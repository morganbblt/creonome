import "server-only";
import { getAuth } from "@/src/lib/auth/server";
import { resolveApiBaseUrl } from "./api-base-url";
import { CreonomeApiClient } from "./creonome-api.client";

export function createServerApiClient(): CreonomeApiClient {
  return new CreonomeApiClient(
    resolveApiBaseUrl(process.env.API_URL ?? "http://localhost:4000"),
    async () => {
      const { data, error } = await getAuth().token();
      if (error || !data?.token) {
        throw new Error("No Neon JWT is available for the API request");
      }
      return data.token;
    },
  );
}
