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
}

export const PRIVACY_REPOSITORY = Symbol("PRIVACY_REPOSITORY");
