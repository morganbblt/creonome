/** The Creator DNA bible §11.1 four-layer model. See dna_traits.layer. */
export type DnaTraitLayer = "declared" | "observed" | "learned" | "forbidden";

export type CreatorDnaTraitRecord = {
  id: string;
  category: string;
  label: string;
  value: string;
  layer: DnaTraitLayer;
  confidence: string | null;
  evidence: Record<string, unknown>;
};

/**
 * Input for promoting a repeated, approved explicit-feedback signal into a
 * layer="learned" Creator DNA trait (see MemoryCandidatesService.approve).
 * Idempotent per (category, label): re-promoting the same category/label
 * pair updates the existing learned trait's value/evidence instead of
 * creating a duplicate.
 */
export type LearnedTraitInput = {
  category: string;
  label: string;
  value: string;
  confidence: string;
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
  /**
   * Upserts a layer="learned" trait into a new Creator DNA version, keyed
   * on (category, label). Returns null when the creator has no Creator DNA
   * yet (nothing to promote into) -- callers must treat this as a no-op,
   * not an error, since promotion is a best-effort side effect of
   * reviewing memory candidates, not the primary action.
   */
  upsertLearnedTrait(
    creatorProfileId: string,
    input: LearnedTraitInput,
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
