import type { PrivacyExportKind } from "@creonome/contracts";

export type PrivacyPreferencesRecord = {
  modelTrainingOptIn: boolean;
  keepRushesAfterExport: boolean;
  updatedAt: Date;
};

export type AccountDeletionRecord = {
  id: string;
  status: "scheduled";
  requestedAt: Date;
  scheduledFor: Date;
};

export type PrivacyStateRecord = {
  preferences: PrivacyPreferencesRecord;
  accountDeletion: AccountDeletionRecord | null;
};

export type UpdatePrivacyPreferencesRecord = {
  workspaceId: string;
  userId: string;
  modelTrainingOptIn: boolean;
  keepRushesAfterExport: boolean;
};

export type ScheduleAccountDeletionRecord = {
  workspaceId: string;
  userId: string;
  scheduledFor: Date;
};

export type DueAccountDeletionRecord = {
  id: string;
  workspaceId: string;
  scheduledFor: Date;
};

export type WorkspaceSourceAssetRecord = {
  id: string;
  gcsUri: string;
};

export interface PrivacyRepository {
  getState(workspaceId: string): Promise<PrivacyStateRecord>;
  isWorkspaceOwner(workspaceId: string, userId: string): Promise<boolean>;
  updatePreferences(
    input: UpdatePrivacyPreferencesRecord,
  ): Promise<PrivacyPreferencesRecord>;
  buildExport(
    workspaceId: string,
    kind: PrivacyExportKind,
    userId: string,
  ): Promise<Record<string, unknown>>;
  scheduleAccountDeletion(
    input: ScheduleAccountDeletionRecord,
  ): Promise<AccountDeletionRecord>;
  cancelAccountDeletion(
    workspaceId: string,
    requestId: string,
    userId: string,
  ): Promise<boolean>;
  /** Scheduled (non-cancelled) requests whose grace period has elapsed. */
  findDueAccountDeletions(now: Date): Promise<DueAccountDeletionRecord[]>;
  /** Source assets still on record for a workspace, for GCS + row cleanup. */
  listWorkspaceSourceAssets(
    workspaceId: string,
  ): Promise<WorkspaceSourceAssetRecord[]>;
  /** Removes a single source asset row after its GCS object is gone. */
  deleteWorkspaceSourceAsset(
    workspaceId: string,
    assetId: string,
  ): Promise<void>;
  /** Deletes creator_dna_versions (cascading dna_traits) for a workspace. */
  deleteWorkspaceCreatorDna(workspaceId: string): Promise<void>;
  /** Deletes projects (cascading versions/scripts/storyboards/exports). */
  deleteWorkspaceProjects(workspaceId: string): Promise<void>;
  /** Marks a due request as executed; leaves credit_ledger untouched. */
  markAccountDeletionExecuted(
    requestId: string,
    workspaceId: string,
  ): Promise<void>;
}

export const PRIVACY_REPOSITORY = Symbol("PRIVACY_REPOSITORY");
