import type { CreateAssetInput } from "@creonome/contracts";

export type LibraryAssetRecord = {
  id: string;
  projectId: string | null;
  name: string;
  kind: string | null;
  mimeType: string | null;
  byteSize: number | null;
  durationSeconds: number | null;
  status: string;
  source: "upload" | "generated" | "script" | "export";
  createdAt: Date;
};

export type SourceAssetRecord = LibraryAssetRecord & {
  source: "upload";
  gcsUri: string;
};

export type RegisterAssetInput = CreateAssetInput & {
  workspaceId: string;
  userId: string;
};

/**
 * The most recent `asset_analyses` row for a source asset (P2.4 asset
 * detail route), if analysis has ever run for it -- e.g. via the
 * onboarding pipeline's `POST /onboarding/assets/:assetId/analyze`. `result`
 * is the raw JSONB payload; the caller parses it against
 * `OnboardingAssetInsightSchema` the same way
 * `NeonOnboardingRepository#toAsset` does, since it's the same table keyed
 * only by `source_asset_id`.
 */
export type AssetAnalysisRecord = {
  status: string;
  result: Record<string, unknown>;
  errorCode: string | null;
  completedAt: Date | null;
};

export interface AssetsRepository {
  list(workspaceId: string): Promise<LibraryAssetRecord[]>;
  create(input: RegisterAssetInput): Promise<LibraryAssetRecord>;
  findSourceById(
    workspaceId: string,
    assetId: string,
  ): Promise<SourceAssetRecord | null>;
  deleteSource(workspaceId: string, assetId: string): Promise<boolean>;
  /**
   * Not workspace-scoped by itself -- callers must first confirm asset
   * ownership via {@link findSourceById}, which this method is always
   * paired with (see AssetsService#get).
   */
  findLatestAnalysis(assetId: string): Promise<AssetAnalysisRecord | null>;
}

export const ASSETS_REPOSITORY = Symbol("ASSETS_REPOSITORY");
