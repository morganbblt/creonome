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

export interface AssetsRepository {
  list(workspaceId: string): Promise<LibraryAssetRecord[]>;
  create(input: RegisterAssetInput): Promise<LibraryAssetRecord>;
  findSourceById(
    workspaceId: string,
    assetId: string,
  ): Promise<SourceAssetRecord | null>;
  deleteSource(workspaceId: string, assetId: string): Promise<boolean>;
}

export const ASSETS_REPOSITORY = Symbol("ASSETS_REPOSITORY");
