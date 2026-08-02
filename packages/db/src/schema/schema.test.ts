import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  creatorDnaVersions,
  creonomeTables,
  exports,
  feedbackEvents,
  generationJobs,
  memoryCandidates,
  opportunityBatches,
  opportunities,
  projectVersions,
  socialConnections,
  sourceAssets,
  storyboardScenes,
  workspaces,
} from "./index.js";

const expectedTables = [
  "asset_analyses",
  "audit_events",
  "credit_accounts",
  "credit_ledger",
  "creator_dna_versions",
  "creator_profiles",
  "dna_traits",
  "exports",
  "feedback_events",
  "generated_assets",
  "generation_jobs",
  "memory_candidates",
  "opportunities",
  "opportunity_batches",
  "project_versions",
  "projects",
  "scripts",
  "social_connections",
  "source_assets",
  "storyboard_scenes",
  "storyboards",
  "trend_candidates",
  "trend_clusters",
  "trend_snapshots",
  "trend_sources",
  "users",
  "workspace_members",
  "workspaces",
];

describe("Creonome relational schema", () => {
  it("declares every canonical product entity plus opportunity batches", () => {
    expect(creonomeTables.map(getTableName).sort()).toEqual(
      [...expectedTables].sort(),
    );
  });

  it("stores only encrypted social credentials", () => {
    const columnNames = getTableConfig(socialConnections).columns.map(
      (column) => column.name,
    );

    expect(columnNames).toContain("access_token_ciphertext");
    expect(columnNames).toContain("refresh_token_ciphertext");
    expect(columnNames).not.toContain("access_token");
    expect(columnNames).not.toContain("refresh_token");
  });

  it("enforces one opportunity per position in a three-card batch", () => {
    const batchConfig = getTableConfig(opportunityBatches);
    const opportunityConfig = getTableConfig(opportunities);

    expect(batchConfig.checks.map((check) => check.name)).toContain(
      "opportunity_batches_size_check",
    );
    expect(opportunityConfig.checks.map((check) => check.name)).toContain(
      "opportunities_position_check",
    );
    expect(
      opportunityConfig.uniqueConstraints.map((item) => item.name),
    ).toContain("opportunities_batch_position_unique");
  });

  it("deduplicates opportunity generation requests by workspace", () => {
    const batchConfig = getTableConfig(opportunityBatches);

    expect(batchConfig.columns.map((column) => column.name)).toContain(
      "idempotency_key",
    );
    expect(batchConfig.uniqueConstraints.map((item) => item.name)).toContain(
      "opportunity_batches_workspace_idempotency_unique",
    );
  });

  it("indexes secondary foreign keys used for ownership and audit joins", () => {
    const indexedNames = [
      creatorDnaVersions,
      exports,
      feedbackEvents,
      generationJobs,
      memoryCandidates,
      projectVersions,
      sourceAssets,
    ].flatMap((table) =>
      getTableConfig(table).indexes.map((item) => item.config.name),
    );

    expect(indexedNames).toEqual(
      expect.arrayContaining([
        "creator_dna_versions_created_by_idx",
        "exports_requested_by_idx",
        "exports_generated_asset_idx",
        "feedback_events_user_idx",
        "generation_jobs_requested_by_idx",
        "memory_candidates_reviewed_by_idx",
        "project_versions_created_by_idx",
        "source_assets_uploaded_by_idx",
      ]),
    );
  });

  it("cascades an account deletion through its owned workspace", () => {
    const ownerForeignKey = getTableConfig(workspaces).foreignKeys.find(
      (foreignKey) =>
        foreignKey.reference().columns[0]?.name === "owner_user_id",
    );

    expect(ownerForeignKey?.onDelete).toBe("cascade");
  });

  it("persists the production directions required for every storyboard scene", () => {
    expect(
      getTableConfig(storyboardScenes).columns.map((column) => column.name),
    ).toEqual(
      expect.arrayContaining([
        "b_roll",
        "transition",
        "required_asset",
        "sound",
        "editing_note",
        "reference_frame_url",
      ]),
    );
  });
});
