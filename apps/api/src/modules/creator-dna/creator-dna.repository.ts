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
  source: string;
  restoredFromVersion: number | null;
  createdAt: Date;
};

export type CreatorDnaVersionDetailRecord = CreatorDnaRecord & {
  source: string;
  restoredFromVersion: number | null;
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
  updateTrait(
    creatorProfileId: string,
    userId: string,
    traitId: string,
    value: string,
  ): Promise<CreatorDnaRecord | null>;
  confirmCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null>;
  listVersions(creatorProfileId: string): Promise<CreatorDnaVersionRecord[]>;
  getVersion(
    creatorProfileId: string,
    version: number,
  ): Promise<CreatorDnaVersionDetailRecord | null>;
  restoreVersion(
    creatorProfileId: string,
    userId: string,
    version: number,
  ): Promise<CreatorDnaRecord | null>;
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
