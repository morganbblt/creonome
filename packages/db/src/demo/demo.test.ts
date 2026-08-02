import { getTableName } from "drizzle-orm";
import {
  buildDemoDataset,
  buildDemoSeedPlan,
  createDrizzleDemoSeedRepository,
  seedDemoDatabase,
} from "./index.js";

describe("Creonome hackathon dataset", () => {
  it("builds the Nova Sainte workspace with exactly three ranked opportunities", () => {
    const demo = buildDemoDataset();

    expect(demo.user.displayName).toBe("Nova Sainte");
    expect(demo.workspace.name).toBe("Nova Sainte Studio");
    expect(demo.project.title).toBe("Warehouse Tapes");
    expect(demo.opportunityBatch.size).toBe(3);
    expect(demo.opportunities).toHaveLength(3);
    expect(demo.opportunities.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("starts with a traceable 60-credit grant and no reservation", () => {
    const demo = buildDemoDataset();

    expect(demo.creditAccount.balance).toBe(60);
    expect(demo.creditAccount.reserved).toBe(0);
    expect(
      demo.creditLedger.reduce(
        (total, entry) => total + (entry.balanceDelta ?? 0),
        0,
      ),
    ).toBe(60);
  });

  it("covers the complete creative path from DNA to a generated asset", () => {
    const demo = buildDemoDataset();

    expect(demo.dnaVersion.version).toBe(1);
    expect(demo.dnaTraits).toHaveLength(6);
    expect(demo.project.currentLevel).toBe("video");
    expect(demo.projectVersion.level).toBe("video");
    expect(demo.script.hook).toContain("record");
    expect(demo.storyboardScenes).toHaveLength(3);
    expect(demo.generationJob.status).toBe("succeeded");
    expect(demo.generatedAsset.mimeType).toBe("video/mp4");
    expect(demo.generatedAsset.metadata).toMatchObject({
      publicUrl: "/demo/creonome-vertical-demo.mp4",
      simulated: true,
    });
  });

  it("loads the complete labeled sample corpus used by the MVP", () => {
    const demo = buildDemoDataset();

    expect(demo.sourceAssets).toHaveLength(8);
    expect(demo.assetAnalyses).toHaveLength(8);
    expect(demo.trendClusters).toHaveLength(3);
    expect(demo.trendCandidates).toHaveLength(24);
    expect(demo.trendSnapshots).toHaveLength(24);
    expect(
      demo.trendCandidates.every(
        (candidate) =>
          (candidate.metrics as { sampleData?: boolean } | undefined)
            ?.sampleData === true,
      ),
    ).toBe(true);
  });

  it("orders idempotent inserts by foreign-key dependency", () => {
    expect(buildDemoSeedPlan().map((item) => item.tableName)).toEqual([
      "users",
      "workspaces",
      "workspace_members",
      "creator_profiles",
      "creator_dna_versions",
      "dna_traits",
      "source_assets",
      "asset_analyses",
      "trend_sources",
      "trend_clusters",
      "trend_candidates",
      "trend_snapshots",
      "opportunity_batches",
      "opportunities",
      "projects",
      "project_versions",
      "scripts",
      "storyboards",
      "storyboard_scenes",
      "generation_jobs",
      "generated_assets",
      "credit_accounts",
      "credit_ledger",
    ]);
  });

  it("writes every demo row through the Drizzle adapter", async () => {
    const insertedTables: string[] = [];
    const fakeDatabase = {
      insert(table: Parameters<typeof getTableName>[0]) {
        insertedTables.push(getTableName(table));
        return {
          values() {
            return {
              async onConflictDoNothing() {},
            };
          },
        };
      },
    };

    const repository = createDrizzleDemoSeedRepository(fakeDatabase);
    const result = await seedDemoDatabase(repository);

    expect(insertedTables).toEqual(
      buildDemoSeedPlan().map((item) => item.tableName),
    );
    expect(result.insertedRows).toBeGreaterThan(20);
  });
});
