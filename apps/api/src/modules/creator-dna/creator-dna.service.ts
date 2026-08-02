import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreatorDnaSchema, type CreatorDna } from "@creonome/contracts";
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
    const dna = await this.repository.getCurrent(context.creatorProfileId);
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

  async listVersions(principal: AuthPrincipal) {
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
        createdAt: version.createdAt.toISOString(),
      })),
    };
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
