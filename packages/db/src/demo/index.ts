import {
  assetAnalyses,
  creditAccounts,
  creditLedger,
  creatorDnaVersions,
  creatorProfiles,
  dnaTraits,
  generatedAssets,
  generationJobs,
  opportunities,
  opportunityBatches,
  projectVersions,
  projects,
  scripts,
  sourceAssets,
  storyboardScenes,
  storyboards,
  trendCandidates,
  trendClusters,
  trendSnapshots,
  trendSources,
  users,
  workspaceMembers,
  workspaces,
} from "../schema/index.js";

function demoId(sequence: number): string {
  return `01989f00-0000-7000-8000-${String(sequence).padStart(12, "0")}`;
}

const DEMO_IDS = {
  user: "01989f00-0000-7000-8000-000000000001",
  workspace: "01989f00-0000-7000-8000-000000000002",
  creatorProfile: "01989f00-0000-7000-8000-000000000003",
  opportunityBatch: "01989f00-0000-7000-8000-000000000004",
  opportunities: [
    "01989f00-0000-7000-8000-000000000005",
    "01989f00-0000-7000-8000-000000000006",
    "01989f00-0000-7000-8000-000000000007",
  ],
  project: "01989f00-0000-7000-8000-000000000008",
  creditGrant: "01989f00-0000-7000-8000-000000000009",
  dnaVersion: "01989f00-0000-7000-8000-000000000010",
  dnaTraits: [
    "01989f00-0000-7000-8000-000000000011",
    "01989f00-0000-7000-8000-000000000012",
    "01989f00-0000-7000-8000-000000000013",
    "01989f00-0000-7000-8000-000000000014",
    "01989f00-0000-7000-8000-000000000015",
    "01989f00-0000-7000-8000-000000000016",
  ],
  projectVersion: "01989f00-0000-7000-8000-000000000017",
  script: "01989f00-0000-7000-8000-000000000018",
  storyboard: "01989f00-0000-7000-8000-000000000019",
  storyboardScenes: [
    "01989f00-0000-7000-8000-000000000020",
    "01989f00-0000-7000-8000-000000000021",
    "01989f00-0000-7000-8000-000000000022",
  ],
  generationJob: "01989f00-0000-7000-8000-000000000023",
  generatedAsset: "01989f00-0000-7000-8000-000000000024",
  sourceAssets: Array.from({ length: 8 }, (_, index) => demoId(101 + index)),
  assetAnalyses: Array.from({ length: 8 }, (_, index) => demoId(111 + index)),
  trendSources: Array.from({ length: 3 }, (_, index) => demoId(201 + index)),
  trendClusters: Array.from({ length: 3 }, (_, index) => demoId(211 + index)),
  trendCandidates: Array.from({ length: 24 }, (_, index) =>
    demoId(301 + index),
  ),
  trendSnapshots: Array.from({ length: 24 }, (_, index) => demoId(401 + index)),
} as const;

const demoCreatedAt = new Date("2026-08-01T09:00:00.000Z");

type InsertUser = typeof users.$inferInsert;
type InsertWorkspace = typeof workspaces.$inferInsert;
type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;
type InsertCreatorProfile = typeof creatorProfiles.$inferInsert;
type InsertDnaVersion = typeof creatorDnaVersions.$inferInsert;
type InsertDnaTrait = typeof dnaTraits.$inferInsert;
type InsertSourceAsset = typeof sourceAssets.$inferInsert;
type InsertAssetAnalysis = typeof assetAnalyses.$inferInsert;
type InsertTrendSource = typeof trendSources.$inferInsert;
type InsertTrendCluster = typeof trendClusters.$inferInsert;
type InsertTrendCandidate = typeof trendCandidates.$inferInsert;
type InsertTrendSnapshot = typeof trendSnapshots.$inferInsert;
type InsertOpportunityBatch = typeof opportunityBatches.$inferInsert;
type InsertOpportunity = typeof opportunities.$inferInsert;
type InsertProject = typeof projects.$inferInsert;
type InsertProjectVersion = typeof projectVersions.$inferInsert;
type InsertScript = typeof scripts.$inferInsert;
type InsertStoryboard = typeof storyboards.$inferInsert;
type InsertStoryboardScene = typeof storyboardScenes.$inferInsert;
type InsertGenerationJob = typeof generationJobs.$inferInsert;
type InsertGeneratedAsset = typeof generatedAssets.$inferInsert;
type InsertCreditAccount = typeof creditAccounts.$inferInsert;
type InsertCreditLedger = typeof creditLedger.$inferInsert;

export function buildDemoDataset() {
  const user: InsertUser = {
    id: DEMO_IDS.user,
    displayName: "Nova Sainte",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    onboardingStatus: "complete",
    isDemo: true,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const workspace: InsertWorkspace = {
    id: DEMO_IDS.workspace,
    ownerUserId: user.id!,
    name: "Nova Sainte Studio",
    slug: "nova-sainte-studio",
    plan: "demo",
    isDemo: true,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const creatorProfile: InsertCreatorProfile = {
    id: DEMO_IDS.creatorProfile,
    workspaceId: workspace.id!,
    userId: user.id!,
    stageName: "Nova Sainte",
    handle: "@novasainte",
    bio: "Digging nocturnal textures between warehouse drums and intimate field recordings.",
    audienceDescription:
      "Diggers et producteurs débutants, 18–34, FR et EN, découverte sur TikTok puis Reels.",
    languages: ["fr", "en"],
    genres: ["electronic", "ambient", "leftfield"],
    onboardingStatus: "complete",
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const workspaceMember: InsertWorkspaceMember = {
    workspaceId: workspace.id!,
    userId: user.id!,
    role: "owner",
    createdAt: demoCreatedAt,
  };

  const opportunityBatch: InsertOpportunityBatch = {
    id: DEMO_IDS.opportunityBatch,
    workspaceId: workspace.id!,
    creatorProfileId: creatorProfile.id!,
    kind: "daily",
    size: 3,
    status: "available",
    availableAt: demoCreatedAt,
    createdAt: demoCreatedAt,
  };

  const dnaVersion: InsertDnaVersion = {
    id: DEMO_IDS.dnaVersion,
    creatorProfileId: creatorProfile.id!,
    version: 1,
    summary:
      "Nocturnal electronic storytelling built from tactile details, restraint and a final sonic reveal.",
    source: "onboarding",
    confirmed: true,
    createdByUserId: user.id!,
    createdAt: demoCreatedAt,
  };

  const dnaTraitSeeds = [
    ["voice", "Tone", "precise, intimate, never over-explained"],
    ["visual", "Palette", "charcoal rooms, warm practical lights, soft grain"],
    [
      "music",
      "Signature",
      "unstable textures resolved by a physical drum pattern",
    ],
    ["story", "Arc", "quiet observation followed by one decisive reveal"],
    ["audience", "Core", "night listeners, crate diggers and early producers"],
    ["boundary", "Avoid", "generic productivity language and forced hype"],
  ] as const;

  const dnaTraitsRows: InsertDnaTrait[] = dnaTraitSeeds.map(
    ([category, label, value], index) => ({
      id: DEMO_IDS.dnaTraits[index]!,
      dnaVersionId: dnaVersion.id!,
      category,
      label,
      value,
      confidence: "0.950",
      evidence: { source: "demo-onboarding", excerpt: value },
      position: index + 1,
      createdAt: demoCreatedAt,
    }),
  );

  const sourceAssetSeeds = [
    ["01-warehouse-rehearsal.mp4", 31_400_000, 42, "restrained wide rehearsal"],
    ["02-crate-find-closeup.mp4", 18_900_000, 24, "tactile record close-up"],
    ["03-sampler-workflow.mp4", 27_600_000, 36, "three-step sampler workflow"],
    ["04-room-tone-session.mp4", 22_800_000, 31, "quiet field-recording setup"],
    ["05-synth-macro.mp4", 16_200_000, 19, "single decisive synth gesture"],
    ["06-drum-reveal.mp4", 29_100_000, 33, "late physical drum reveal"],
    [
      "07-night-studio-portrait.mp4",
      20_700_000,
      27,
      "warm practical-light portrait",
    ],
    [
      "08-one-take-arrangement.mp4",
      34_500_000,
      45,
      "repeatable one-take arrangement",
    ],
  ] as const;

  const sourceAssetsRows: InsertSourceAsset[] = sourceAssetSeeds.map(
    ([fileName, byteSize, durationSeconds, creativeSignal], index) => ({
      id: DEMO_IDS.sourceAssets[index]!,
      workspaceId: workspace.id!,
      uploadedByUserId: user.id!,
      fileName,
      mimeType: "video/mp4",
      byteSize,
      gcsUri: `gs://creonome-909754432431-media/demo/nova-sainte/source/${fileName}`,
      status: "ready",
      metadata: {
        sampleData: true,
        representativeness: "representative",
        durationSeconds,
        creativeSignal,
      },
      createdAt: new Date(demoCreatedAt.getTime() + index * 60_000),
      updatedAt: new Date(demoCreatedAt.getTime() + index * 60_000),
    }),
  );

  const assetAnalysesRows: InsertAssetAnalysis[] = sourceAssetsRows.map(
    (asset, index) => ({
      id: DEMO_IDS.assetAnalyses[index]!,
      sourceAssetId: asset.id!,
      provider: "demo",
      model: "sample-corpus-v1",
      status: "succeeded",
      summary: `Representative creator reference ${index + 1}: ${sourceAssetSeeds[index]![3]}.`,
      result: {
        sampleData: true,
        confidence: 0.94,
        palette:
          index % 2 === 0
            ? "charcoal and warm practicals"
            : "soft grain and steel blue",
        pacing:
          index % 3 === 0
            ? "restrained then reveal"
            : "steady one-take progression",
      },
      createdAt: new Date(demoCreatedAt.getTime() + index * 60_000),
      completedAt: new Date(demoCreatedAt.getTime() + index * 60_000 + 30_000),
    }),
  );

  const trendSourceSeeds = [
    ["synthetic_tiktok", "vertical_video", "Synthetic TikTok signal set"],
    ["synthetic_instagram", "vertical_video", "Synthetic Reels signal set"],
    ["licensed_research", "editorial", "Authorized creator research set"],
  ] as const;

  const trendSourcesRows: InsertTrendSource[] = trendSourceSeeds.map(
    ([provider, kind, title], index) => ({
      id: DEMO_IDS.trendSources[index]!,
      provider,
      kind,
      title,
      metadata: {
        sampleData: true,
        rights: provider === "licensed_research" ? "authorized" : "synthetic",
        simulatedMetrics: true,
      },
      observedAt: new Date(demoCreatedAt.getTime() - index * 3_600_000),
      createdAt: demoCreatedAt,
    }),
  );

  const trendClusterSeeds = [
    ["Quiet process, loud reveal", "emerging", 88],
    ["One object, three transformations", "growing", 82],
    ["Recipe-card production stories", "stable", 76],
  ] as const;

  const trendClustersRows: InsertTrendCluster[] = trendClusterSeeds.map(
    ([title, lifecycle, momentumScore], index) => ({
      id: DEMO_IDS.trendClusters[index]!,
      workspaceId: workspace.id!,
      title,
      summary: `${title} across eight clearly labeled synthetic or authorized reference videos.`,
      lifecycle,
      momentumScore,
      firstSeenAt: new Date(demoCreatedAt.getTime() - (9 - index) * 86_400_000),
      lastSeenAt: demoCreatedAt,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt,
    }),
  );

  const trendCandidatesRows: InsertTrendCandidate[] = Array.from(
    { length: 24 },
    (_, index) => {
      const clusterIndex = Math.floor(index / 8);
      const sourceIndex = index % trendSourcesRows.length;
      const views = 48_000 + index * 7_250;
      return {
        id: DEMO_IDS.trendCandidates[index]!,
        sourceId: trendSourcesRows[sourceIndex]!.id!,
        clusterId: trendClustersRows[clusterIndex]!.id!,
        externalId: `sample-signal-${String(index + 1).padStart(2, "0")}`,
        title: `${trendClusterSeeds[clusterIndex]![0]} · sample ${index + 1}`,
        description:
          "Synthetic or authorized reference used only to demonstrate opportunity scoring.",
        region: index % 2 === 0 ? "FR" : "EU",
        languages: index % 3 === 0 ? ["fr", "en"] : ["en"],
        metrics: {
          sampleData: true,
          simulatedMetrics: true,
          views,
          completionRate: Number((0.51 + (index % 7) * 0.035).toFixed(3)),
          engagementRate: Number((0.062 + (index % 5) * 0.011).toFixed(3)),
        },
        status: "clustered",
        observedAt: new Date(demoCreatedAt.getTime() - index * 1_800_000),
        createdAt: demoCreatedAt,
      };
    },
  );

  const trendSnapshotsRows: InsertTrendSnapshot[] = trendCandidatesRows.map(
    (candidate, index) => ({
      id: DEMO_IDS.trendSnapshots[index]!,
      trendCandidateId: candidate.id!,
      metrics: {
        ...candidate.metrics,
        snapshotLabel: "Simulated MVP metric",
      },
      capturedAt: new Date(demoCreatedAt.getTime() + index * 1_000),
    }),
  );

  const opportunitySeeds = [
    {
      title: "Flip the crate find everyone skipped",
      pitch:
        "Turn one overlooked record into a fast reveal: original texture, your flip, then the detail that changed everything.",
      strategy: "cross_sector",
      scoreOverall: 91,
      scoreMomentum: 88,
      scoreDnaFit: 96,
      scoreNovelty: 87,
      scoreFeasibility: 94,
      effort: "low",
      duration: 35,
    },
    {
      title: "Silent studio, loud decisions",
      pitch:
        "Film a nearly silent production session and let three on-screen decisions carry the story before the final drop.",
      strategy: "format_transfer",
      scoreOverall: 87,
      scoreMomentum: 82,
      scoreDnaFit: 94,
      scoreNovelty: 90,
      scoreFeasibility: 83,
      effort: "medium",
      duration: 28,
    },
    {
      title: "Track recipe: one room, three ingredients",
      pitch:
        "Build a track recipe from a room tone, one drum break and one unstable synth gesture, then reveal the mix.",
      strategy: "recipe",
      scoreOverall: 84,
      scoreMomentum: 79,
      scoreDnaFit: 89,
      scoreNovelty: 86,
      scoreFeasibility: 88,
      effort: "low",
      duration: 42,
    },
  ] as const;

  const opportunitiesRows: InsertOpportunity[] = opportunitySeeds.map(
    (seed, index) => ({
      id: DEMO_IDS.opportunities[index]!,
      batchId: opportunityBatch.id!,
      workspaceId: workspace.id!,
      creatorProfileId: creatorProfile.id!,
      trendClusterId: trendClustersRows[index]!.id!,
      position: index + 1,
      strategy: seed.strategy,
      title: seed.title,
      pitch: seed.pitch,
      rationale:
        "High DNA fit with a production path designed for one short session.",
      currentLevel: "idea",
      scoreOverall: seed.scoreOverall,
      scoreMomentum: seed.scoreMomentum,
      scoreDnaFit: seed.scoreDnaFit,
      scoreNovelty: seed.scoreNovelty,
      scoreFeasibility: seed.scoreFeasibility,
      scoreConfidence: "high",
      effort: seed.effort,
      platform: "tiktok",
      estimatedDurationSeconds: seed.duration,
      status: "available",
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt,
    }),
  );

  const project: InsertProject = {
    id: DEMO_IDS.project,
    workspaceId: workspace.id!,
    creatorProfileId: creatorProfile.id!,
    opportunityId: opportunitiesRows[0]!.id,
    title: "Warehouse Tapes",
    status: "active",
    currentLevel: "storyboard",
    currentVersion: 1,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const projectVersion: InsertProjectVersion = {
    id: DEMO_IDS.projectVersion,
    projectId: project.id!,
    version: 1,
    level: "storyboard",
    changeSource: "opportunity_upgrade",
    changeSummary: "Initial script and three-scene storyboard",
    lockedFields: ["hook"],
    snapshot: { opportunityId: opportunitiesRows[0]!.id, durationSeconds: 35 },
    createdByUserId: user.id!,
    createdAt: demoCreatedAt,
  };

  const script: InsertScript = {
    id: DEMO_IDS.script,
    projectId: project.id!,
    projectVersionId: projectVersion.id!,
    title: "The record everyone skipped",
    hook: "This is the record everyone skipped — listen to what happens at 0:17.",
    body: "Play the untouched texture, isolate the unstable tail, then cut directly to the drum pattern built around it.",
    callToAction: "Which detail would you flip?",
    caption: "One overlooked texture. One decision. One new track.",
    platforms: ["tiktok", "instagram"],
    durationSeconds: 35,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const storyboard: InsertStoryboard = {
    id: DEMO_IDS.storyboard,
    projectId: project.id!,
    projectVersionId: projectVersion.id!,
    title: "Warehouse Tapes — crate flip",
    aspectRatio: "9:16",
    durationSeconds: 35,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const storyboardSceneSeeds = [
    {
      heading: "The find",
      description:
        "Close handheld shot of the sleeve under one warm practical light.",
      shotType: "macro handheld",
      voiceover: script.hook,
      onScreenText: "the record everyone skipped",
      durationSeconds: 8,
    },
    {
      heading: "The detail",
      description:
        "Waveform and sampler cuts reveal the unstable tail at 0:17.",
      shotType: "screen detail",
      voiceover: "The whole flip starts inside this half-second tail.",
      onScreenText: "0:17 → isolate",
      durationSeconds: 12,
    },
    {
      heading: "The flip",
      description:
        "Wide studio frame, then a direct cut to the finished drum reveal.",
      shotType: "locked wide",
      voiceover: script.callToAction,
      onScreenText: "original → flip",
      durationSeconds: 15,
    },
  ] as const;

  const storyboardScenesRows: InsertStoryboardScene[] =
    storyboardSceneSeeds.map((scene, index) => ({
      id: DEMO_IDS.storyboardScenes[index]!,
      storyboardId: storyboard.id!,
      position: index + 1,
      ...scene,
      createdAt: demoCreatedAt,
    }));

  const generationJob: InsertGenerationJob = {
    id: DEMO_IDS.generationJob,
    workspaceId: workspace.id!,
    projectId: project.id!,
    requestedByUserId: user.id!,
    kind: "video_render",
    provider: "demo",
    model: "handoff-fixture-v1",
    status: "succeeded",
    progress: 100,
    idempotencyKey: "demo-warehouse-tapes-render-v1",
    input: { storyboardId: storyboard.id },
    output: { durationSeconds: 35, aspectRatio: "9:16" },
    createdAt: demoCreatedAt,
    startedAt: new Date("2026-08-01T09:10:00.000Z"),
    completedAt: new Date("2026-08-01T09:10:42.000Z"),
    updatedAt: new Date("2026-08-01T09:10:42.000Z"),
  };

  const generatedAsset: InsertGeneratedAsset = {
    id: DEMO_IDS.generatedAsset,
    generationJobId: generationJob.id!,
    workspaceId: workspace.id!,
    projectId: project.id!,
    kind: "video",
    gcsUri:
      "gs://creonome-909754432431-media/demo/nova-sainte/warehouse-tapes-v1.mp4",
    mimeType: "video/mp4",
    byteSize: 8_400_000,
    durationSeconds: 35,
    metadata: { width: 1080, height: 1920, fixture: true },
    createdAt: new Date("2026-08-01T09:10:42.000Z"),
  };

  const creditAccount: InsertCreditAccount = {
    workspaceId: workspace.id!,
    balance: 60,
    reserved: 0,
    updatedAt: demoCreatedAt,
  };

  const creditLedgerRows: InsertCreditLedger[] = [
    {
      id: DEMO_IDS.creditGrant,
      workspaceId: workspace.id!,
      kind: "grant",
      balanceDelta: 60,
      reservedDelta: 0,
      idempotencyKey: "demo-initial-credit-grant-v1",
      description: "Hackathon demo credit grant",
      metadata: { source: "seed" },
      createdAt: demoCreatedAt,
    },
  ];

  return {
    user,
    workspace,
    workspaceMember,
    creatorProfile,
    dnaVersion,
    dnaTraits: dnaTraitsRows,
    sourceAssets: sourceAssetsRows,
    assetAnalyses: assetAnalysesRows,
    trendSources: trendSourcesRows,
    trendClusters: trendClustersRows,
    trendCandidates: trendCandidatesRows,
    trendSnapshots: trendSnapshotsRows,
    opportunityBatch,
    opportunities: opportunitiesRows,
    project,
    projectVersion,
    script,
    storyboard,
    storyboardScenes: storyboardScenesRows,
    generationJob,
    generatedAsset,
    creditAccount,
    creditLedger: creditLedgerRows,
  };
}

export type DemoSeedTableName =
  | "users"
  | "workspaces"
  | "workspace_members"
  | "creator_profiles"
  | "creator_dna_versions"
  | "dna_traits"
  | "source_assets"
  | "asset_analyses"
  | "trend_sources"
  | "trend_clusters"
  | "trend_candidates"
  | "trend_snapshots"
  | "opportunity_batches"
  | "opportunities"
  | "projects"
  | "project_versions"
  | "scripts"
  | "storyboards"
  | "storyboard_scenes"
  | "generation_jobs"
  | "generated_assets"
  | "credit_accounts"
  | "credit_ledger";

export interface DemoSeedPlanItem {
  readonly tableName: DemoSeedTableName;
  readonly rows: readonly unknown[];
}

export function buildDemoSeedPlan(): readonly DemoSeedPlanItem[] {
  const demo = buildDemoDataset();

  return [
    { tableName: "users", rows: [demo.user] },
    { tableName: "workspaces", rows: [demo.workspace] },
    { tableName: "workspace_members", rows: [demo.workspaceMember] },
    { tableName: "creator_profiles", rows: [demo.creatorProfile] },
    { tableName: "creator_dna_versions", rows: [demo.dnaVersion] },
    { tableName: "dna_traits", rows: demo.dnaTraits },
    { tableName: "source_assets", rows: demo.sourceAssets },
    { tableName: "asset_analyses", rows: demo.assetAnalyses },
    { tableName: "trend_sources", rows: demo.trendSources },
    { tableName: "trend_clusters", rows: demo.trendClusters },
    { tableName: "trend_candidates", rows: demo.trendCandidates },
    { tableName: "trend_snapshots", rows: demo.trendSnapshots },
    { tableName: "opportunity_batches", rows: [demo.opportunityBatch] },
    { tableName: "opportunities", rows: demo.opportunities },
    { tableName: "projects", rows: [demo.project] },
    { tableName: "project_versions", rows: [demo.projectVersion] },
    { tableName: "scripts", rows: [demo.script] },
    { tableName: "storyboards", rows: [demo.storyboard] },
    { tableName: "storyboard_scenes", rows: demo.storyboardScenes },
    { tableName: "generation_jobs", rows: [demo.generationJob] },
    { tableName: "generated_assets", rows: [demo.generatedAsset] },
    { tableName: "credit_accounts", rows: [demo.creditAccount] },
    { tableName: "credit_ledger", rows: demo.creditLedger },
  ];
}

type SeedInsertQuery = {
  onConflictDoNothing(): PromiseLike<unknown>;
};

type SeedInsertBuilder = {
  values(rows: readonly unknown[]): SeedInsertQuery;
};

export interface DemoSeedDrizzleDatabase {
  insert(table: (typeof tableByName)[DemoSeedTableName]): SeedInsertBuilder;
}

export interface DemoSeedRepository {
  write(item: DemoSeedPlanItem): Promise<void>;
}

const tableByName = {
  users,
  workspaces,
  workspace_members: workspaceMembers,
  creator_profiles: creatorProfiles,
  creator_dna_versions: creatorDnaVersions,
  dna_traits: dnaTraits,
  source_assets: sourceAssets,
  asset_analyses: assetAnalyses,
  trend_sources: trendSources,
  trend_clusters: trendClusters,
  trend_candidates: trendCandidates,
  trend_snapshots: trendSnapshots,
  opportunity_batches: opportunityBatches,
  opportunities,
  projects,
  project_versions: projectVersions,
  scripts,
  storyboards,
  storyboard_scenes: storyboardScenes,
  generation_jobs: generationJobs,
  generated_assets: generatedAssets,
  credit_accounts: creditAccounts,
  credit_ledger: creditLedger,
} as const;

export function createDrizzleDemoSeedRepository(
  database: DemoSeedDrizzleDatabase,
): DemoSeedRepository {
  return {
    async write(item) {
      await database
        .insert(tableByName[item.tableName])
        .values(item.rows)
        .onConflictDoNothing();
    },
  };
}

export async function seedDemoDatabase(repository: DemoSeedRepository) {
  const plan = buildDemoSeedPlan();

  for (const item of plan) {
    await repository.write(item);
  }

  return {
    insertedRows: plan.reduce((total, item) => total + item.rows.length, 0),
  };
}

export { DEMO_IDS };
