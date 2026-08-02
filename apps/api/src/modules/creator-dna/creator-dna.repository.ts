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

export interface CreatorDnaRepository {
  getCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null>;
  confirmCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null>;
  listVersions(creatorProfileId: string): Promise<CreatorDnaVersionRecord[]>;
}

export const CREATOR_DNA_REPOSITORY = Symbol("CREATOR_DNA_REPOSITORY");
