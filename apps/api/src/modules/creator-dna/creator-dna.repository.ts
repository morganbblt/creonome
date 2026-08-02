export type CreatorDnaTraitRecord = {
  id: string;
  category: string;
  label: string;
  value: string;
  confidence: string | null;
  evidence: Record<string, unknown>;
};

export type CreatorDnaRecord = {
  id: string;
  version: number;
  summary: string;
  confirmed: boolean;
  traits: CreatorDnaTraitRecord[];
};

export type CreatorDnaVersionRecord = Omit<CreatorDnaRecord, "traits"> & {
  createdAt: Date;
};

export type CreatorDnaReferenceImageRecord = {
  id: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  gcsUri: string;
  createdAt: Date;
};

export interface CreatorDnaRepository {
  getCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null>;
  confirmCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null>;
  listVersions(creatorProfileId: string): Promise<CreatorDnaVersionRecord[]>;
  getPeopleReferenceImage(
    workspaceId: string,
  ): Promise<CreatorDnaReferenceImageRecord | null>;
  setPeopleReferenceImage(
    workspaceId: string,
    assetId: string,
  ): Promise<CreatorDnaReferenceImageRecord | null>;
  clearPeopleReferenceImage(workspaceId: string): Promise<boolean>;
}

export const CREATOR_DNA_REPOSITORY = Symbol("CREATOR_DNA_REPOSITORY");
