import type { OpportunityFeedbackAction } from "@creonome/contracts";

export type OpportunityRecord = {
  id: string;
  position: number;
  title: string;
  pitch: string;
  hook?: string | null;
  scoreOverall: number;
  scoreConfidence: string;
  scoreMomentum: number;
  scoreDnaFit: number;
  scoreNovelty: number;
  scoreFeasibility: number;
  rationale: string | null;
  effort: string;
  platform: string;
  estimatedDurationSeconds: number | null;
  projectId: string | null;
  projectCurrentLevel: string | null;
  availableAt: Date;
  trendSignal?: OpportunityTrendSignalRecord | null;
};

export type OpportunityTrendSignalRecord = {
  title: string;
  lifecycle: string;
  momentumScore: number;
  observedAt: Date;
  evidenceCount: number;
  sampleData: boolean;
};

export type TrendSignalRecord = {
  id: string;
  title: string;
  summary: string;
  lifecycle: string;
  momentumScore: number;
  lastSeenAt: Date;
};

export const currentOpportunityStatuses = ["available", "saved"] as const;

export interface OpportunitiesRepository {
  listTrendSignals(workspaceId: string): Promise<TrendSignalRecord[]>;
  listCurrent(workspaceId: string): Promise<OpportunityRecord[]>;
  findById(
    workspaceId: string,
    opportunityId: string,
  ): Promise<OpportunityRecord | null>;
  saveAsProject(input: SaveOpportunityInput): Promise<ProjectRecord | null>;
  findByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<OpportunityRecord[]>;
  createBatch(input: CreateOpportunityBatchInput): Promise<OpportunityRecord[]>;
  recordFeedback(
    input: RecordOpportunityFeedbackInput,
  ): Promise<OpportunityFeedbackRecord>;
  createRevision(
    input: CreateOpportunityRevisionInput,
  ): Promise<OpportunityRevisionRecord | null>;
  findScriptUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<ScriptUpgradeRecord | null>;
  findExistingScriptUpgrade(
    workspaceId: string,
    opportunityId: string,
  ): Promise<ScriptUpgradeRecord | null>;
  createScriptUpgrade(
    input: CreateScriptUpgradeInput,
  ): Promise<ScriptUpgradeRecord | null>;
}

export type RecordOpportunityFeedbackInput = {
  workspaceId: string;
  creatorProfileId: string;
  userId: string;
  opportunityId: string;
  projectId: string | null;
  action: OpportunityFeedbackAction;
  rating: number;
  comment: string | null;
  memoryContent: string | null;
};

export type OpportunityFeedbackRecord = {
  id: string;
  opportunityId: string;
  action: RecordOpportunityFeedbackInput["action"];
  memoryCandidate: MemoryCandidateRecord | null;
  createdAt: Date;
};

export type ProjectRecord = {
  id: string;
  opportunityId: string | null;
  title: string;
  status: string;
  currentLevel: string;
  currentVersion: number;
  updatedAt: Date;
};

export type SaveOpportunityInput = {
  workspaceId: string;
  creatorProfileId: string;
  userId: string;
  opportunityId: string;
};

export type GeneratedOpportunity = {
  title: string;
  pitch: string;
  score: number;
  confidence: "low" | "medium" | "high";
};

export type CreateOpportunityBatchInput = {
  workspaceId: string;
  creatorProfileId: string;
  idempotencyKey: string;
  opportunities: GeneratedOpportunity[];
  trendSignals: TrendSignalRecord[];
};

export type GeneratedOpportunityRevision = {
  title: string;
  pitch: string;
  hook: string;
  changeSummary: string;
  memoryContent: string;
};

export type CreateOpportunityRevisionInput = {
  workspaceId: string;
  creatorProfileId: string;
  userId: string;
  opportunityId: string;
  memoryScope: "idea" | "project" | "creator";
  lockedFields: string[];
  generated: GeneratedOpportunityRevision;
};

export type MemoryCandidateRecord = {
  id: string;
  status: "pending";
  scope: "idea" | "project" | "creator";
  content: string;
};

export type OpportunityRevisionRecord = {
  project: ProjectRecord;
  version: number;
  title: string;
  pitch: string;
  hook: string;
  changeSummary: string;
  memoryCandidate: MemoryCandidateRecord | null;
};

export type GeneratedScript = {
  title: string;
  hook: string;
  body: string;
  callToAction: string | null;
  caption: string | null;
  platforms: Array<"tiktok" | "instagram" | "youtube">;
  durationSeconds: number | null;
};

export type CreateScriptUpgradeInput = {
  workspaceId: string;
  creatorProfileId: string;
  userId: string;
  opportunityId: string;
  idempotencyKey: string;
  provider: string;
  model: string;
  generated: GeneratedScript;
};

export type ScriptRecord = GeneratedScript & {
  id: string;
  projectId: string;
};

export type WorkflowJobRecord = {
  id: string;
  kind: string;
  provider: string;
  model: string;
  status: string;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type ScriptUpgradeRecord = {
  project: ProjectRecord;
  script: ScriptRecord;
  job: WorkflowJobRecord;
};

export const OPPORTUNITIES_REPOSITORY = Symbol("OPPORTUNITIES_REPOSITORY");
