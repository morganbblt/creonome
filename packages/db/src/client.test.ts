import { createDatabase, resolveDatabaseUrl } from "./client.js";

describe("database configuration", () => {
  it("accepts Neon PostgreSQL connection strings", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://user:pass@example.neon.tech/neondb",
      }),
    ).toBe("postgresql://user:pass@example.neon.tech/neondb");
  });

  it("prefers the pooled runtime URL and rejects unsupported protocols", () => {
    expect(() =>
      resolveDatabaseUrl({ DATABASE_URL: "https://example.com/database" }),
    ).toThrow("DATABASE_URL must use postgres:// or postgresql://");
    expect(() => resolveDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });

  it("creates a lazy Drizzle client without opening a connection", () => {
    const database = createDatabase(
      "postgresql://user:pass@example.neon.tech/neondb",
    );

    expect(database.select).toBeTypeOf("function");
    expect(database.batch).toBeTypeOf("function");
  });
});
