import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const packageDirectory = fileURLToPath(new URL(".", import.meta.url));
const rootEnv = resolve(packageDirectory, "../../.env");

if (existsSync(rootEnv)) {
  loadEnvFile(rootEnv);
}

const databaseUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: "timestamp",
    schema: "drizzle",
    table: "__creonome_migrations",
  },
  strict: true,
  verbose: true,
});
