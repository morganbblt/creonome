import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

type JsonObject = Record<string, unknown>;

const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);
const createdAt = () =>
  timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    authUserId: uuid("auth_user_id").unique(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    locale: text("locale").notNull().default("fr-FR"),
    timezone: text("timezone").notNull().default("Europe/Paris"),
    onboardingStatus: text("onboarding_status").notNull().default("pending"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "users_onboarding_status_check",
      sql`${table.onboardingStatus} in ('pending', 'in_progress', 'complete')`,
    ),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: id(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authOrganizationId: uuid("auth_organization_id").unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan").notNull().default("demo"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("workspaces_slug_unique").on(table.slug),
    index("workspaces_owner_user_idx").on(table.ownerUserId),
    check(
      "workspaces_plan_check",
      sql`${table.plan} in ('demo', 'free', 'creator', 'studio')`,
    ),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_idx").on(table.userId),
    check(
      "workspace_members_role_check",
      sql`${table.role} in ('owner', 'admin', 'member', 'viewer')`,
    ),
  ],
);

export const privacyPreferences = pgTable("privacy_preferences", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  modelTrainingOptIn: boolean("model_training_opt_in").notNull().default(false),
  keepRushesAfterExport: boolean("keep_rushes_after_export")
    .notNull()
    .default(true),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: updatedAt(),
});

export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("scheduled"),
    scheduledFor: timestamp("scheduled_for", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    cancelledAt: timestamp("cancelled_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    requestedAt: createdAt(),
  },
  (table) => [
    index("account_deletion_requests_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    uniqueIndex("account_deletion_requests_one_scheduled_idx")
      .on(table.workspaceId)
      .where(sql`${table.status} = 'scheduled'`),
    index("account_deletion_requests_requested_by_idx").on(
      table.requestedByUserId,
    ),
    check(
      "account_deletion_requests_status_check",
      sql`${table.status} in ('scheduled', 'cancelled', 'completed')`,
    ),
  ],
);

export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stageName: text("stage_name").notNull(),
    handle: text("handle"),
    bio: text("bio"),
    audienceDescription: text("audience_description"),
    languages: text("languages")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    onboardingStatus: text("onboarding_status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("creator_profiles_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("creator_profiles_workspace_idx").on(table.workspaceId),
    index("creator_profiles_user_idx").on(table.userId),
  ],
);

export const creatorDnaVersions = pgTable(
  "creator_dna_versions",
  {
    id: id(),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    summary: text("summary").notNull(),
    source: text("source").notNull().default("onboarding"),
    confirmed: boolean("confirmed").notNull().default(false),
    restoredFromVersion: integer("restored_from_version"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("creator_dna_versions_profile_version_unique").on(
      table.creatorProfileId,
      table.version,
    ),
    index("creator_dna_versions_profile_idx").on(table.creatorProfileId),
    index("creator_dna_versions_created_by_idx").on(table.createdByUserId),
    check("creator_dna_versions_version_check", sql`${table.version} > 0`),
    check(
      "creator_dna_versions_restored_from_check",
      sql`${table.restoredFromVersion} is null or ${table.restoredFromVersion} > 0`,
    ),
  ],
);

export const dnaTraits = pgTable(
  "dna_traits",
  {
    id: id(),
    dnaVersionId: uuid("dna_version_id")
      .notNull()
      .references(() => creatorDnaVersions.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    evidence: jsonb("evidence").$type<JsonObject>().notNull().default({}),
    position: integer("position").notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    unique("dna_traits_version_category_label_unique").on(
      table.dnaVersionId,
      table.category,
      table.label,
    ),
    index("dna_traits_version_idx").on(table.dnaVersionId),
    check(
      "dna_traits_confidence_check",
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 1)`,
    ),
  ],
);

export const memoryCandidates = pgTable(
  "memory_candidates",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("mem0"),
    kind: text("kind").notNull(),
    /**
     * The blast radius this candidate should be remembered at. Historically
     * this was inferred at read time from `kind` (see git history for
     * memory-candidates.service.ts before migration
     * 20260804215532_add_memory_candidates_scope_confidence), which silently
     * dropped "idea"-scoped candidates since `kind` only ever held "project"
     * or "creator". This column is now written explicitly by every creation
     * site so "idea" round-trips correctly.
     */
    scope: text("scope").notNull().default("creator"),
    content: text("content").notNull(),
    evidence: jsonb("evidence").$type<JsonObject>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    /**
     * Heuristic confidence (0..1) that this candidate reflects a durable
     * creator preference rather than a one-off instruction. No scoring model
     * exists yet, so creation sites currently write a flat heuristic default
     * per source (see neon-opportunities.repository.ts); this column just
     * needs to be real and queryable so the review queue can eventually sort
     * by it.
     */
    confidence: numeric("confidence", { precision: 4, scale: 3 })
      .notNull()
      .default("0.5"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("memory_candidates_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("memory_candidates_creator_idx").on(table.creatorProfileId),
    index("memory_candidates_reviewed_by_idx").on(table.reviewedByUserId),
    check(
      "memory_candidates_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    check(
      "memory_candidates_scope_check",
      sql`${table.scope} in ('idea', 'project', 'creator')`,
    ),
    check(
      "memory_candidates_confidence_check",
      sql`${table.confidence} >= 0 and ${table.confidence} <= 1`,
    ),
  ],
);

export const socialConnections = pgTable(
  "social_connections",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    displayName: text("display_name").notNull(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: text("status").notNull().default("connected"),
    accessTokenCiphertext: text("access_token_ciphertext").notNull(),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    tokenEncryptionVersion: integer("token_encryption_version")
      .notNull()
      .default(1),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { mode: "date", withTimezone: true }),
    failureReason: text("failure_reason"),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("social_connections_provider_account_unique").on(
      table.provider,
      table.externalAccountId,
    ),
    index("social_connections_workspace_idx").on(table.workspaceId),
    index("social_connections_creator_idx").on(table.creatorProfileId),
    check(
      "social_connections_provider_check",
      sql`${table.provider} in ('tiktok', 'instagram')`,
    ),
    check(
      "social_connections_status_check",
      sql`${table.status} in ('connected', 'expired', 'revoked', 'error')`,
    ),
  ],
);

export const sourceAssets = pgTable(
  "source_assets",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    gcsUri: text("gcs_uri").notNull().unique(),
    checksumSha256: text("checksum_sha256"),
    status: text("status").notNull().default("uploaded"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("source_assets_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("source_assets_uploaded_by_idx").on(table.uploadedByUserId),
    check("source_assets_byte_size_check", sql`${table.byteSize} >= 0`),
  ],
);

export const assetAnalyses = pgTable(
  "asset_analyses",
  {
    id: id(),
    sourceAssetId: uuid("source_asset_id")
      .notNull()
      .references(() => sourceAssets.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().default("queued"),
    summary: text("summary"),
    result: jsonb("result").$type<JsonObject>().notNull().default({}),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    index("asset_analyses_asset_idx").on(table.sourceAssetId),
    check(
      "asset_analyses_status_check",
      sql`${table.status} in ('queued', 'running', 'succeeded', 'failed')`,
    ),
  ],
);

export const trendSources = pgTable(
  "trend_sources",
  {
    id: id(),
    provider: text("provider").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    observedAt: timestamp("observed_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [
    index("trend_sources_provider_observed_idx").on(
      table.provider,
      table.observedAt,
    ),
  ],
);

export const trendClusters = pgTable(
  "trend_clusters",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    lifecycle: text("lifecycle").notNull().default("emerging"),
    momentumScore: integer("momentum_score").notNull(),
    firstSeenAt: timestamp("first_seen_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("trend_clusters_workspace_lifecycle_idx").on(
      table.workspaceId,
      table.lifecycle,
    ),
    check(
      "trend_clusters_momentum_check",
      sql`${table.momentumScore} between 0 and 100`,
    ),
  ],
);

export const trendCandidates = pgTable(
  "trend_candidates",
  {
    id: id(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => trendSources.id, { onDelete: "cascade" }),
    clusterId: uuid("cluster_id").references(() => trendClusters.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id"),
    title: text("title").notNull(),
    description: text("description"),
    region: text("region"),
    languages: text("languages")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    metrics: jsonb("metrics").$type<JsonObject>().notNull().default({}),
    status: text("status").notNull().default("candidate"),
    observedAt: timestamp("observed_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("trend_candidates_source_external_unique").on(
      table.sourceId,
      table.externalId,
    ),
    index("trend_candidates_source_idx").on(table.sourceId),
    index("trend_candidates_cluster_idx").on(table.clusterId),
  ],
);

export const trendSnapshots = pgTable(
  "trend_snapshots",
  {
    id: id(),
    trendCandidateId: uuid("trend_candidate_id")
      .notNull()
      .references(() => trendCandidates.id, { onDelete: "cascade" }),
    metrics: jsonb("metrics").$type<JsonObject>().notNull(),
    capturedAt: timestamp("captured_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("trend_snapshots_candidate_captured_unique").on(
      table.trendCandidateId,
      table.capturedAt,
    ),
    index("trend_snapshots_candidate_idx").on(table.trendCandidateId),
  ],
);

export const opportunityBatches = pgTable(
  "opportunity_batches",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("daily"),
    idempotencyKey: text("idempotency_key"),
    size: integer("size").notNull().default(3),
    status: text("status").notNull().default("available"),
    availableAt: timestamp("available_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("opportunity_batches_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("opportunity_batches_workspace_available_idx").on(
      table.workspaceId,
      table.availableAt,
    ),
    index("opportunity_batches_creator_idx").on(table.creatorProfileId),
    check("opportunity_batches_size_check", sql`${table.size} = 3`),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: id(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => opportunityBatches.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    trendClusterId: uuid("trend_cluster_id").references(
      () => trendClusters.id,
      {
        onDelete: "set null",
      },
    ),
    position: integer("position").notNull(),
    strategy: text("strategy").notNull(),
    title: text("title").notNull(),
    pitch: text("pitch").notNull(),
    rationale: text("rationale"),
    currentLevel: text("current_level").notNull().default("idea"),
    scoreOverall: integer("score_overall").notNull(),
    scoreMomentum: integer("score_momentum").notNull(),
    scoreDnaFit: integer("score_dna_fit").notNull(),
    scoreNovelty: integer("score_novelty").notNull(),
    scoreFeasibility: integer("score_feasibility").notNull(),
    scoreConfidence: text("score_confidence").notNull(),
    effort: text("effort").notNull(),
    platform: text("platform").notNull(),
    estimatedDurationSeconds: integer("estimated_duration_seconds"),
    status: text("status").notNull().default("available"),
    savedAt: timestamp("saved_at", { mode: "date", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("opportunities_batch_position_unique").on(
      table.batchId,
      table.position,
    ),
    index("opportunities_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("opportunities_creator_idx").on(table.creatorProfileId),
    index("opportunities_cluster_idx").on(table.trendClusterId),
    check(
      "opportunities_position_check",
      sql`${table.position} between 1 and 3`,
    ),
    check(
      "opportunities_scores_check",
      sql`${table.scoreOverall} between 0 and 100 and ${table.scoreMomentum} between 0 and 100 and ${table.scoreDnaFit} between 0 and 100 and ${table.scoreNovelty} between 0 and 100 and ${table.scoreFeasibility} between 0 and 100`,
    ),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    currentLevel: text("current_level").notNull().default("idea"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("projects_workspace_updated_idx").on(
      table.workspaceId,
      table.updatedAt,
    ),
    index("projects_creator_idx").on(table.creatorProfileId),
    index("projects_opportunity_idx").on(table.opportunityId),
    uniqueIndex("projects_opportunity_unique")
      .on(table.opportunityId)
      .where(sql`${table.opportunityId} is not null`),
    check("projects_current_version_check", sql`${table.currentVersion} > 0`),
  ],
);

export const projectVersions = pgTable(
  "project_versions",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    level: text("level").notNull(),
    parentVersion: integer("parent_version"),
    changeSource: text("change_source").notNull(),
    changeSummary: text("change_summary").notNull(),
    lockedFields: text("locked_fields")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    snapshot: jsonb("snapshot").$type<JsonObject>().notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("project_versions_project_version_unique").on(
      table.projectId,
      table.version,
    ),
    index("project_versions_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("project_versions_created_by_idx").on(table.createdByUserId),
    check("project_versions_version_check", sql`${table.version} > 0`),
  ],
);

export const scripts = pgTable(
  "scripts",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectVersionId: uuid("project_version_id").references(
      () => projectVersions.id,
      {
        onDelete: "set null",
      },
    ),
    title: text("title").notNull(),
    hook: text("hook").notNull(),
    body: text("body").notNull(),
    callToAction: text("call_to_action"),
    caption: text("caption"),
    platforms: text("platforms")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    durationSeconds: integer("duration_seconds"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("scripts_project_idx").on(table.projectId),
    index("scripts_version_idx").on(table.projectVersionId),
  ],
);

export const storyboards = pgTable(
  "storyboards",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectVersionId: uuid("project_version_id").references(
      () => projectVersions.id,
      {
        onDelete: "set null",
      },
    ),
    title: text("title").notNull(),
    aspectRatio: text("aspect_ratio").notNull().default("9:16"),
    durationSeconds: integer("duration_seconds"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("storyboards_project_idx").on(table.projectId),
    index("storyboards_version_idx").on(table.projectVersionId),
  ],
);

export const storyboardScenes = pgTable(
  "storyboard_scenes",
  {
    id: id(),
    storyboardId: uuid("storyboard_id")
      .notNull()
      .references(() => storyboards.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    heading: text("heading").notNull(),
    description: text("description").notNull(),
    shotType: text("shot_type"),
    voiceover: text("voiceover"),
    onScreenText: text("on_screen_text"),
    bRoll: text("b_roll"),
    transition: text("transition"),
    requiredAsset: text("required_asset"),
    sound: text("sound"),
    editingNote: text("editing_note"),
    referenceFrameUrl: text("reference_frame_url"),
    durationSeconds: integer("duration_seconds").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("storyboard_scenes_storyboard_position_unique").on(
      table.storyboardId,
      table.position,
    ),
    index("storyboard_scenes_storyboard_idx").on(table.storyboardId),
    check("storyboard_scenes_position_check", sql`${table.position} > 0`),
    check(
      "storyboard_scenes_duration_check",
      sql`${table.durationSeconds} > 0`,
    ),
  ],
);

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    input: jsonb("input").$type<JsonObject>().notNull().default({}),
    output: jsonb("output").$type<JsonObject>().notNull().default({}),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("generation_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("generation_jobs_project_idx").on(table.projectId),
    index("generation_jobs_requested_by_idx").on(table.requestedByUserId),
    check(
      "generation_jobs_status_check",
      sql`${table.status} in ('queued', 'running', 'succeeded', 'failed', 'failed_retryable', 'failed_final', 'cancelled')`,
    ),
    check(
      "generation_jobs_progress_check",
      sql`${table.progress} between 0 and 100`,
    ),
  ],
);

export const generatedAssets = pgTable(
  "generated_assets",
  {
    id: id(),
    generationJobId: uuid("generation_job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    gcsUri: text("gcs_uri").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }),
    durationSeconds: integer("duration_seconds"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("generated_assets_job_idx").on(table.generationJobId),
    index("generated_assets_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("generated_assets_project_idx").on(table.projectId),
  ],
);

export const exports = pgTable(
  "exports",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    generatedAssetId: uuid("generated_asset_id").references(
      () => generatedAssets.id,
      {
        onDelete: "set null",
      },
    ),
    format: text("format").notNull(),
    status: text("status").notNull().default("queued"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    index("exports_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("exports_project_idx").on(table.projectId),
    index("exports_requested_by_idx").on(table.requestedByUserId),
    index("exports_generated_asset_idx").on(table.generatedAssetId),
  ],
);

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    workspaceId: uuid("workspace_id")
      .primaryKey()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("credit_accounts_balance_check", sql`${table.balance} >= 0`),
    check("credit_accounts_reserved_check", sql`${table.reserved} >= 0`),
    check(
      "credit_accounts_available_check",
      sql`${table.reserved} <= ${table.balance}`,
    ),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => creditAccounts.workspaceId, { onDelete: "cascade" }),
    generationJobId: uuid("generation_job_id").references(
      () => generationJobs.id,
      {
        onDelete: "set null",
      },
    ),
    kind: text("kind").notNull(),
    balanceDelta: integer("balance_delta").notNull().default(0),
    reservedDelta: integer("reserved_delta").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("credit_ledger_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("credit_ledger_job_idx").on(table.generationJobId),
    check(
      "credit_ledger_nonzero_check",
      sql`${table.balanceDelta} <> 0 or ${table.reservedDelta} <> 0`,
    ),
    check(
      "credit_ledger_kind_check",
      sql`${table.kind} in ('grant', 'reservation', 'commit', 'release', 'purchase', 'adjustment')`,
    ),
  ],
);

export const feedbackEvents = pgTable(
  "feedback_events",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    rating: integer("rating"),
    comment: text("comment"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("feedback_events_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("feedback_events_user_idx").on(table.userId),
    index("feedback_events_opportunity_idx").on(table.opportunityId),
    index("feedback_events_project_idx").on(table.projectId),
    check(
      "feedback_events_rating_check",
      sql`${table.rating} is null or ${table.rating} between 1 and 5`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    requestId: text("request_id"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_events_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("audit_events_actor_idx").on(table.actorUserId),
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const creonomeTables = [
  users,
  workspaces,
  workspaceMembers,
  privacyPreferences,
  accountDeletionRequests,
  creatorProfiles,
  creatorDnaVersions,
  dnaTraits,
  memoryCandidates,
  socialConnections,
  sourceAssets,
  assetAnalyses,
  trendSources,
  trendClusters,
  trendCandidates,
  trendSnapshots,
  opportunityBatches,
  opportunities,
  projects,
  projectVersions,
  scripts,
  storyboards,
  storyboardScenes,
  generationJobs,
  generatedAssets,
  exports,
  creditAccounts,
  creditLedger,
  feedbackEvents,
  auditEvents,
] as const;
