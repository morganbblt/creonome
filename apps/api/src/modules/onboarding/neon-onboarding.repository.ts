import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  OnboardingAssetInsightSchema,
  OnboardingProfileSchema,
  OnboardingRepresentativenessSchema,
  OnboardingStatusSchema,
  type OnboardingAsset,
  type OnboardingCalibrationResponseInput,
  type OnboardingProfile,
  type OnboardingRepresentativeness,
  type OnboardingState,
} from "@creonome/contracts";
import {
  assetAnalyses,
  creatorDnaVersions,
  creatorProfiles,
  type CreonomeDatabase,
  dnaTraits,
  memoryCandidates,
  sourceAssets,
  users,
} from "@creonome/db";
import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type { WorkspaceContext } from "../workspaces/workspace.repository.js";
import {
  calibrationResponseConfidence,
  calibrationResponseContent,
  deriveOnboardingStep,
  profileToTraitInputs,
} from "./onboarding-mapping.js";
import type {
  CompleteOnboardingAnalysisInput,
  FailOnboardingAnalysisInput,
  OnboardingRepository,
  OnboardingSourceAssetRecord,
} from "./onboarding.repository.js";

type ProfileRow = {
  stageName: string;
  genres: string[];
  audienceDescription: string | null;
  onboardingStatus: string;
};

type AnalysisRow = {
  sourceAssetId: string;
  status: string;
  result: Record<string, unknown>;
  errorCode: string | null;
};

export class NeonOnboardingRepository implements OnboardingRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async getState(context: WorkspaceContext): Promise<OnboardingState> {
    const database = this.requireDatabase();
    const [profileRow] = await database
      .select({
        stageName: creatorProfiles.stageName,
        genres: creatorProfiles.genres,
        audienceDescription: creatorProfiles.audienceDescription,
        onboardingStatus: creatorProfiles.onboardingStatus,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.id, context.creatorProfileId))
      .limit(1);
    if (!profileRow) {
      throw new ServiceUnavailableException("Creator profile is unavailable");
    }

    const assets = await database
      .select({
        id: sourceAssets.id,
        fileName: sourceAssets.fileName,
        mimeType: sourceAssets.mimeType,
        byteSize: sourceAssets.byteSize,
        status: sourceAssets.status,
        metadata: sourceAssets.metadata,
        createdAt: sourceAssets.createdAt,
      })
      .from(sourceAssets)
      .where(eq(sourceAssets.workspaceId, context.workspaceId))
      .orderBy(asc(sourceAssets.createdAt));
    const analyses = assets.length
      ? await database
          .select({
            sourceAssetId: assetAnalyses.sourceAssetId,
            status: assetAnalyses.status,
            result: assetAnalyses.result,
            errorCode: assetAnalyses.errorCode,
          })
          .from(assetAnalyses)
          .where(
            inArray(
              assetAnalyses.sourceAssetId,
              assets.map(({ id }) => id),
            ),
          )
          .orderBy(desc(assetAnalyses.createdAt))
      : [];
    const latestAnalyses = new Map<string, AnalysisRow>();
    for (const analysis of analyses) {
      if (!latestAnalyses.has(analysis.sourceAssetId)) {
        latestAnalyses.set(analysis.sourceAssetId, analysis);
      }
    }

    const onboardingAssets = assets.map((asset) =>
      this.toAsset(asset, latestAnalyses.get(asset.id)),
    );
    const profile = await this.getCurrentProfile(
      context.creatorProfileId,
      profileRow,
    );
    const status = OnboardingStatusSchema.catch("pending").parse(
      profileRow.onboardingStatus,
    );
    const readyCount = onboardingAssets.filter(
      ({ status: assetStatus }) => assetStatus === "ready",
    ).length;

    return {
      status,
      step: deriveOnboardingStep(
        status,
        onboardingAssets.length,
        Boolean(profile),
      ),
      readyCount,
      recommendedAssetCount: 3,
      assets: onboardingAssets,
      profile,
    };
  }

  async getStageName(creatorProfileId: string): Promise<string> {
    const [profile] = await this.requireDatabase()
      .select({ stageName: creatorProfiles.stageName })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.id, creatorProfileId))
      .limit(1);
    if (!profile) {
      throw new ServiceUnavailableException("Creator profile is unavailable");
    }
    return profile.stageName;
  }

  async findSourceAsset(
    workspaceId: string,
    assetId: string,
  ): Promise<OnboardingSourceAssetRecord | null> {
    const [asset] = await this.requireDatabase()
      .select({
        id: sourceAssets.id,
        workspaceId: sourceAssets.workspaceId,
        fileName: sourceAssets.fileName,
        mimeType: sourceAssets.mimeType,
        gcsUri: sourceAssets.gcsUri,
        status: sourceAssets.status,
      })
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.id, assetId),
          eq(sourceAssets.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    return asset ?? null;
  }

  async startAnalysis(input: {
    assetId: string;
    provider: string;
    model: string;
  }): Promise<string> {
    const database = this.requireDatabase();
    const analysisId = randomUUID();
    const now = new Date();
    await database.batch([
      database.insert(assetAnalyses).values({
        id: analysisId,
        sourceAssetId: input.assetId,
        provider: input.provider,
        model: input.model,
        status: "running",
        createdAt: now,
      }),
      database
        .update(sourceAssets)
        .set({ status: "analyzing", updatedAt: now })
        .where(eq(sourceAssets.id, input.assetId)),
    ] as const);
    return analysisId;
  }

  async completeAnalysis(
    input: CompleteOnboardingAnalysisInput,
  ): Promise<void> {
    const database = this.requireDatabase();
    const now = new Date();
    await database.batch([
      database
        .update(assetAnalyses)
        .set({
          provider: input.provider,
          model: input.model,
          status: "succeeded",
          summary: input.insight.summary,
          result: input.insight,
          errorCode: null,
          completedAt: now,
        })
        .where(eq(assetAnalyses.id, input.analysisId)),
      database
        .update(sourceAssets)
        .set({ status: "ready", updatedAt: now })
        .where(eq(sourceAssets.id, input.assetId)),
      database
        .update(users)
        .set({ onboardingStatus: "in_progress", updatedAt: now })
        .where(eq(users.id, input.context.userId)),
      database
        .update(creatorProfiles)
        .set({ onboardingStatus: "in_progress", updatedAt: now })
        .where(eq(creatorProfiles.id, input.context.creatorProfileId)),
    ] as const);
  }

  async failAnalysis(input: FailOnboardingAnalysisInput): Promise<void> {
    const database = this.requireDatabase();
    const now = new Date();
    await database.batch([
      database
        .update(assetAnalyses)
        .set({
          status: "failed",
          errorCode: input.errorCode,
          completedAt: now,
        })
        .where(eq(assetAnalyses.id, input.analysisId)),
      database
        .update(sourceAssets)
        .set({ status: "failed", updatedAt: now })
        .where(eq(sourceAssets.id, input.assetId)),
    ] as const);
  }

  async updateRepresentativeness(
    workspaceId: string,
    assetId: string,
    representativeness: OnboardingRepresentativeness,
  ): Promise<boolean> {
    const database = this.requireDatabase();
    const [asset] = await database
      .select({ metadata: sourceAssets.metadata })
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.id, assetId),
          eq(sourceAssets.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!asset) return false;

    const updated = await database
      .update(sourceAssets)
      .set({
        metadata: { ...asset.metadata, representativeness },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sourceAssets.id, assetId),
          eq(sourceAssets.workspaceId, workspaceId),
        ),
      )
      .returning({ id: sourceAssets.id });
    return updated.length > 0;
  }

  saveDraftProfile(
    context: WorkspaceContext,
    profile: OnboardingProfile,
  ): Promise<void> {
    return this.saveProfile(context, profile, false, "observed", "in_progress");
  }

  completeProfile(
    context: WorkspaceContext,
    profile: OnboardingProfile,
  ): Promise<void> {
    return this.saveProfile(context, profile, true, "declared", "complete");
  }

  async saveCalibrationResponses(
    context: WorkspaceContext,
    responses: OnboardingCalibrationResponseInput[],
  ): Promise<number> {
    if (responses.length === 0) return 0;
    const database = this.requireDatabase();
    const now = new Date();
    await database.insert(memoryCandidates).values(
      responses.map((response) => ({
        id: randomUUID(),
        workspaceId: context.workspaceId,
        creatorProfileId: context.creatorProfileId,
        provider: "creonome",
        kind: "creator",
        scope: "creator",
        confidence: calibrationResponseConfidence(response.response),
        content: calibrationResponseContent(response),
        evidence: {
          source: "onboarding_calibration",
          conceptId: response.conceptId,
          response: response.response,
          title: response.title,
        },
        status: "pending",
        createdAt: now,
      })),
    );
    return responses.length;
  }

  private async getCurrentProfile(
    creatorProfileId: string,
    profileRow: ProfileRow,
  ): Promise<OnboardingProfile | null> {
    const database = this.requireDatabase();
    const [version] = await database
      .select({ id: creatorDnaVersions.id })
      .from(creatorDnaVersions)
      .where(eq(creatorDnaVersions.creatorProfileId, creatorProfileId))
      .orderBy(desc(creatorDnaVersions.version))
      .limit(1);
    if (!version) return null;

    const traits = await database
      .select({ category: dnaTraits.category, value: dnaTraits.value })
      .from(dnaTraits)
      .where(eq(dnaTraits.dnaVersionId, version.id))
      .orderBy(asc(dnaTraits.position));
    const values = (category: string) =>
      traits
        .filter((trait) => trait.category === category)
        .map(({ value }) => value);
    const candidate = OnboardingProfileSchema.safeParse({
      stageName: profileRow.stageName,
      disciplines: values("discipline"),
      genres: values("genre").length ? values("genre") : profileRow.genres,
      creativeSignature: values("signature")[0],
      themes: values("theme"),
      targetAudience: values("audience")[0] ?? profileRow.audienceDescription,
      boundaries: values("boundary"),
    });
    return candidate.success ? candidate.data : null;
  }

  private toAsset(
    asset: {
      id: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
      status: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
    },
    analysis: AnalysisRow | undefined,
  ): OnboardingAsset {
    const parsedInsight = OnboardingAssetInsightSchema.safeParse(
      analysis?.result,
    );
    const parsedRepresentativeness =
      OnboardingRepresentativenessSchema.safeParse(
        asset.metadata.representativeness,
      );
    const status = this.assetStatus(asset.status, parsedInsight.success);
    return {
      id: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      status,
      representativeness: parsedRepresentativeness.success
        ? parsedRepresentativeness.data
        : "representative",
      analysis: parsedInsight.success ? parsedInsight.data : null,
      errorMessage:
        status === "failed"
          ? analysis?.errorCode === "unsupported_media_type"
            ? "This file type isn’t supported yet."
            : "We couldn't analyze this file. Try again."
          : null,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private assetStatus(
    sourceStatus: string,
    hasValidInsight: boolean,
  ): OnboardingAsset["status"] {
    if (sourceStatus === "ready" && hasValidInsight) return "ready";
    if (sourceStatus === "failed") return "failed";
    if (sourceStatus === "analyzing") return "analyzing";
    return "uploaded";
  }

  private async saveProfile(
    context: WorkspaceContext,
    profile: OnboardingProfile,
    confirmed: boolean,
    provenance: "observed" | "declared",
    onboardingStatus: "in_progress" | "complete",
  ): Promise<void> {
    const database = this.requireDatabase();
    const [latest] = await database
      .select({ version: max(creatorDnaVersions.version) })
      .from(creatorDnaVersions)
      .where(eq(creatorDnaVersions.creatorProfileId, context.creatorProfileId));
    const version = (latest?.version ?? 0) + 1;
    const versionId = randomUUID();
    const now = new Date();
    const traits = profileToTraitInputs(profile, provenance);
    await database.batch([
      database.insert(creatorDnaVersions).values({
        id: versionId,
        creatorProfileId: context.creatorProfileId,
        version,
        summary: `${profile.creativeSignature} Audience: ${profile.targetAudience}`,
        source: "onboarding",
        confirmed,
        createdByUserId: context.userId,
        createdAt: now,
      }),
      database.insert(dnaTraits).values(
        traits.map((trait) => ({
          id: randomUUID(),
          dnaVersionId: versionId,
          ...trait,
          createdAt: now,
        })),
      ),
      database
        .update(creatorProfiles)
        .set({
          stageName: profile.stageName,
          genres: profile.genres,
          audienceDescription: profile.targetAudience,
          onboardingStatus,
          updatedAt: now,
        })
        .where(eq(creatorProfiles.id, context.creatorProfileId)),
      database
        .update(users)
        .set({ onboardingStatus, updatedAt: now })
        .where(eq(users.id, context.userId)),
    ] as const);
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
