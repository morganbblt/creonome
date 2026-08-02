import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index.js";

type DatabaseEnvironment = Partial<Pick<NodeJS.ProcessEnv, "DATABASE_URL">>;

export function resolveDatabaseUrl(environment: DatabaseEnvironment): string {
  const value = environment.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("DATABASE_URL is required");
  }

  if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }

  return value;
}

type NeonHttpDatabase = ReturnType<typeof drizzle<typeof schema>>;

export type CreonomeDatabase = Omit<NeonHttpDatabase, "transaction">;

export function createDatabase(databaseUrl: string): CreonomeDatabase {
  const queryClient = neon(databaseUrl);
  return drizzle(queryClient, { schema });
}
