import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CreatorDnaSchema,
  type CreatorDna,
  type CreatorDnaTraitDiff,
  type CreatorDnaVersionCompare,
  type CreatorDnaVersionsResponse,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  CREATOR_DNA_REPOSITORY,
  type CreatorDnaRecord,
  type CreatorDnaReferenceImageRecord,
  type CreatorDnaRepository,
} from "./creator-dna.repository.js";

@Injectable()
export class CreatorDnaService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(CREATOR_DNA_REPOSITORY)
    private readonly repository: CreatorDnaRepository,
  ) {}

  async getCurrent(principal: AuthPrincipal): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    return this.getForWorkspaceContext(context);
  }

  /**
   * Same lookup as {@link getCurrent}, but for callers that already have a
   * resolved workspace context and no end-user `AuthPrincipal` to resolve
   * one from — e.g. an internal Cloud Tasks generation-job handler acting
   * on behalf of a workspace it read off the queued job row.
   */
  async getForWorkspaceContext(context: {
    workspaceId: string;
    creatorProfileId: string;
  }): Promise<CreatorDna> {
    const dna = await this.repository.getCurrent(context.creatorProfileId);
    return this.toContract(
      dna,
      await this.repository.getPeopleReferenceImage(context.workspaceId),
    );
  }

  async updateTrait(
    principal: AuthPrincipal,
    traitId: string,
    value: string,
  ): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    const dna = await this.repository.updateTrait(
      context.creatorProfileId,
      context.userId,
      traitId,
      value,
    );
    if (!dna) {
      throw new NotFoundException("Creator DNA trait was not found");
    }
    return this.toContract(
      dna,
      await this.repository.getPeopleReferenceImage(context.workspaceId),
    );
  }

  async confirm(principal: AuthPrincipal): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    const dna = await this.repository.confirmCurrent(context.creatorProfileId);
    return this.toContract(
      dna,
      await this.repository.getPeopleReferenceImage(context.workspaceId),
    );
  }

  async setPeopleReferenceImage(
    principal: AuthPrincipal,
    assetId: string,
  ): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    const image = await this.repository.setPeopleReferenceImage(
      context.workspaceId,
      assetId,
    );
    if (!image) {
      throw new NotFoundException("A supported workspace image was not found");
    }
    return this.toContract(
      await this.repository.getCurrent(context.creatorProfileId),
      image,
    );
  }

  async clearPeopleReferenceImage(
    principal: AuthPrincipal,
  ): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    await this.repository.clearPeopleReferenceImage(context.workspaceId);
    return this.toContract(
      await this.repository.getCurrent(context.creatorProfileId),
      null,
    );
  }

  async listVersions(
    principal: AuthPrincipal,
  ): Promise<CreatorDnaVersionsResponse> {
    const context = await this.workspaces.resolve(principal);
    const versions = await this.repository.listVersions(
      context.creatorProfileId,
    );
    return {
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        summary: version.summary,
        confirmed: version.confirmed,
        source: version.source,
        restoredFromVersion: version.restoredFromVersion,
        createdAt: version.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Creates a NEW version that copies the trait values of `version`. The
   * target version (and every version in between) is never mutated or
   * deleted — restoring is purely additive so the full audit trail stays
   * intact.
   */
  async restoreVersion(
    principal: AuthPrincipal,
    version: number,
  ): Promise<CreatorDna> {
    const context = await this.workspaces.resolve(principal);
    const dna = await this.repository.restoreVersion(
      context.creatorProfileId,
      context.userId,
      version,
    );
    if (!dna) {
      throw new NotFoundException("Creator DNA version was not found");
    }
    return this.toContract(
      dna,
      await this.repository.getPeopleReferenceImage(context.workspaceId),
    );
  }

  async compareVersions(
    principal: AuthPrincipal,
    versionA: number,
    versionB: number,
  ): Promise<CreatorDnaVersionCompare> {
    const context = await this.workspaces.resolve(principal);
    const [a, b] = await Promise.all([
      this.repository.getVersion(context.creatorProfileId, versionA),
      this.repository.getVersion(context.creatorProfileId, versionB),
    ]);
    if (!a || !b) {
      throw new NotFoundException("Creator DNA version was not found");
    }

    return {
      a: { version: a.version, summary: a.summary },
      b: { version: b.version, summary: b.summary },
      traits: this.diffTraits(a.traits, b.traits),
    };
  }

  private diffTraits(
    fromTraits: CreatorDnaRecord["traits"],
    toTraits: CreatorDnaRecord["traits"],
  ): CreatorDnaTraitDiff[] {
    const key = (category: string, label: string) => `${category}::${label}`;
    const fromByKey = new Map(
      fromTraits.map((trait) => [key(trait.category, trait.label), trait]),
    );
    const toByKey = new Map(
      toTraits.map((trait) => [key(trait.category, trait.label), trait]),
    );

    const diffs: CreatorDnaTraitDiff[] = [];

    for (const [traitKey, fromTrait] of fromByKey) {
      const toTrait = toByKey.get(traitKey);
      if (!toTrait) {
        diffs.push({
          category: fromTrait.category,
          label: fromTrait.label,
          status: "removed",
          fromValue: fromTrait.value,
          toValue: null,
        });
      } else if (toTrait.value !== fromTrait.value) {
        diffs.push({
          category: fromTrait.category,
          label: fromTrait.label,
          status: "changed",
          fromValue: fromTrait.value,
          toValue: toTrait.value,
        });
      }
    }

    for (const [traitKey, toTrait] of toByKey) {
      if (!fromByKey.has(traitKey)) {
        diffs.push({
          category: toTrait.category,
          label: toTrait.label,
          status: "added",
          fromValue: null,
          toValue: toTrait.value,
        });
      }
    }

    return diffs;
  }

  private toContract(
    dna: CreatorDnaRecord | null,
    referenceImage: CreatorDnaReferenceImageRecord | null = null,
  ): CreatorDna {
    if (!dna) {
      throw new NotFoundException("Creator DNA has not been generated yet");
    }

    return CreatorDnaSchema.parse({
      version: dna.version,
      summary: dna.summary,
      confirmed: dna.confirmed,
      peopleReferenceImage: referenceImage
        ? {
            id: referenceImage.id,
            fileName: referenceImage.fileName,
            mimeType: referenceImage.mimeType,
            byteSize: referenceImage.byteSize,
            createdAt: referenceImage.createdAt.toISOString(),
          }
        : null,
      traits: dna.traits.map((trait) => ({
        ...trait,
        confidence:
          trait.confidence === null
            ? null
            : Number.parseFloat(trait.confidence),
      })),
    });
  }
}
