import type { ProjectExportFormat } from "@creonome/contracts";

export type CompletedExportRecord = {
  id: string;
  createdAt: Date;
};

export type CreateCompletedExportRecord = {
  workspaceId: string;
  projectId: string;
  userId: string;
  format: ProjectExportFormat;
};

export interface ExportsRepository {
  createCompleted(
    input: CreateCompletedExportRecord,
  ): Promise<CompletedExportRecord>;
}

export const EXPORTS_REPOSITORY = Symbol("EXPORTS_REPOSITORY");
