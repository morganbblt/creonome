import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

describe("database migrations", () => {
  it("links app users to the provisioned Neon Auth user table", () => {
    const packageDirectory = fileURLToPath(new URL("../../", import.meta.url));
    const migrationDirectory = resolve(packageDirectory, "drizzle");
    const migrationSql = readdirSync(migrationDirectory)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) =>
        readFileSync(resolve(migrationDirectory, fileName), "utf8"),
      )
      .join("\n");

    expect(migrationSql).toMatch(
      /REFERENCES\s+"neon_auth"\."user"\("id"\)\s+ON DELETE cascade/,
    );
    expect(migrationSql).toMatch(/trend_cluster_id/);
    expect(migrationSql).toMatch(/01989f00-0000-7000-8000-000000000002/);
  });
});
