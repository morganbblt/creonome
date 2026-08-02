import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import type { PrivacyExportKind } from "@creonome/contracts";
import {
  accountDeletionRequests,
  assetAnalyses,
  auditEvents,
  creatorDnaVersions,
  creatorProfiles,
  creditAccounts,
  creditLedger,
  type CreonomeDatabase,
  dnaTraits,
  exports as projectExports,
  feedbackEvents,
  generatedAssets,
  generationJobs,
  memoryCandidates,
  opportunities,
  privacyPreferences,
  projects,
  projectVersions,
  scripts,
  socialConnections,
  sourceAssets,
  storyboardScenes,
  storyboards,
  workspaces,
} from "@creonome/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import { sanitizePrivacyExport } from "./privacy-export.js";
import type {
  AccountDeletionRecord,
  PrivacyRepository,
  PrivacyStateRecord,
  ScheduleAccountDeletionRecord,
  UpdatePrivacyPreferencesRecord,
} from "./privacy.repository.js";

const preferenceSelection = {
  modelTrainingOptIn: privacyPreferences.modelTrainingOptIn,
  keepRushesAfterExport: privacyPreferences.keepRushesAfterExport,
  updatedAt: privacyPreferences.updatedAt,
};

const deletionSelection = {
  id: accountDeletionRequests.id,
  status: accountDeletionRequests.status,
  requestedAt: accountDeletionRequests.requestedAt,
  scheduledFor: accountDeletionRequests.scheduledFor,
};

export class NeonPrivacyRepository implements PrivacyRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async getState(workspaceId: string): Promise<PrivacyStateRecord> {
    const database = this.requireDatabase();
    const [preferenceRows, deletionRows] = await Promise.all([
      database
        .select(preferenceSelection)
        .from(privacyPreferences)
        .where(eq(privacyPreferences.workspaceId, workspaceId))
        .limit(1),
      database
        .select(deletionSelection)
        .from(accountDeletionRequests)
        .where(
          and(
            eq(accountDeletionRequests.workspaceId, workspaceId),
            eq(accountDeletionRequests.status, "scheduled"),
          ),
        )
        .orderBy(desc(accountDeletionRequests.requestedAt))
        .limit(1),
    ]);
    const preferences = preferenceRows[0] ?? {
      modelTrainingOptIn: false,
      keepRushesAfterExport: true,
      updatedAt: new Date(),
    };
    return {
      preferences,
      accountDeletion: this.toDeletion(deletionRows[0]),
    };
  }

  async isWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    const [workspace] = await this.requireDatabase()
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, userId)),
      )
      .limit(1);
    return Boolean(workspace);
  }

  async updatePreferences(input: UpdatePrivacyPreferencesRecord) {
    const database = this.requireDatabase();
    const updatedAt = new Date();
    const [preferenceRows] = await database.batch([
      database
        .insert(privacyPreferences)
        .values({
          workspaceId: input.workspaceId,
          modelTrainingOptIn: input.modelTrainingOptIn,
          keepRushesAfterExport: input.keepRushesAfterExport,
          updatedByUserId: input.userId,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: privacyPreferences.workspaceId,
          set: {
            modelTrainingOptIn: input.modelTrainingOptIn,
            keepRushesAfterExport: input.keepRushesAfterExport,
            updatedByUserId: input.userId,
            updatedAt,
          },
        })
        .returning(preferenceSelection),
      database.insert(auditEvents).values({
        workspaceId: input.workspaceId,
        actorUserId: input.userId,
        action: "privacy.preferences_updated",
        entityType: "privacy_preferences",
        entityId: input.workspaceId,
        metadata: {
          modelTrainingOptIn: input.modelTrainingOptIn,
          keepRushesAfterExport: input.keepRushesAfterExport,
        },
      }),
    ] as const);
    return preferenceRows[0]!;
  }

  async buildExport(
    workspaceId: string,
    kind: PrivacyExportKind,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const database = this.requireDatabase();
    const [creatorDna, projectData] = await Promise.all([
      this.buildCreatorDnaExport(workspaceId),
      this.buildProjectsExport(workspaceId),
    ]);
    let document: Record<string, unknown> =
      kind === "creator_dna"
        ? { creatorDna }
        : kind === "projects"
          ? { projects: projectData }
          : {
              creatorDna,
              projects: projectData,
              ...(await this.buildWorkspaceExport(workspaceId)),
            };
    document = sanitizePrivacyExport(document) as Record<string, unknown>;
    await database.insert(auditEvents).values({
      workspaceId,
      actorUserId: userId,
      action: "privacy.export_created",
      entityType: "workspace",
      entityId: workspaceId,
      metadata: { kind },
    });
    return document;
  }

  async scheduleAccountDeletion(
    input: ScheduleAccountDeletionRecord,
  ): Promise<AccountDeletionRecord> {
    const existing = await this.findScheduledDeletion(input.workspaceId);
    if (existing) return existing;

    const database = this.requireDatabase();
    const id = randomUUID();
    const requestedAt = new Date();
    try {
      const [requestRows] = await database.batch([
        database
          .insert(accountDeletionRequests)
          .values({
            id,
            workspaceId: input.workspaceId,
            requestedByUserId: input.userId,
            status: "scheduled",
            scheduledFor: input.scheduledFor,
            requestedAt,
          })
          .returning(deletionSelection),
        database.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorUserId: input.userId,
          action: "privacy.account_deletion_scheduled",
          entityType: "account_deletion_request",
          entityId: id,
          metadata: { scheduledFor: input.scheduledFor.toISOString() },
        }),
      ] as const);
      return this.toDeletion(requestRows[0])!;
    } catch (error) {
      const concurrent = await this.findScheduledDeletion(input.workspaceId);
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async cancelAccountDeletion(
    workspaceId: string,
    requestId: string,
    userId: string,
  ): Promise<boolean> {
    const database = this.requireDatabase();
    const [existing] = await database
      .select({ id: accountDeletionRequests.id })
      .from(accountDeletionRequests)
      .where(
        and(
          eq(accountDeletionRequests.id, requestId),
          eq(accountDeletionRequests.workspaceId, workspaceId),
          eq(accountDeletionRequests.status, "scheduled"),
        ),
      )
      .limit(1);
    if (!existing) return false;
    const cancelledAt = new Date();
    await database.batch([
      database
        .update(accountDeletionRequests)
        .set({ status: "cancelled", cancelledAt })
        .where(
          and(
            eq(accountDeletionRequests.id, requestId),
            eq(accountDeletionRequests.workspaceId, workspaceId),
            eq(accountDeletionRequests.status, "scheduled"),
          ),
        ),
      database.insert(auditEvents).values({
        workspaceId,
        actorUserId: userId,
        action: "privacy.account_deletion_cancelled",
        entityType: "account_deletion_request",
        entityId: requestId,
      }),
    ] as const);
    return true;
  }

  private async buildCreatorDnaExport(workspaceId: string) {
    const database = this.requireDatabase();
    const [profile] = await database
      .select({
        id: creatorProfiles.id,
        stageName: creatorProfiles.stageName,
        handle: creatorProfiles.handle,
        bio: creatorProfiles.bio,
        audienceDescription: creatorProfiles.audienceDescription,
        languages: creatorProfiles.languages,
        genres: creatorProfiles.genres,
        onboardingStatus: creatorProfiles.onboardingStatus,
        createdAt: creatorProfiles.createdAt,
        updatedAt: creatorProfiles.updatedAt,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.workspaceId, workspaceId))
      .limit(1);
    if (!profile) return null;
    const versions = await database
      .select({
        id: creatorDnaVersions.id,
        version: creatorDnaVersions.version,
        summary: creatorDnaVersions.summary,
        source: creatorDnaVersions.source,
        confirmed: creatorDnaVersions.confirmed,
        createdAt: creatorDnaVersions.createdAt,
      })
      .from(creatorDnaVersions)
      .where(eq(creatorDnaVersions.creatorProfileId, profile.id))
      .orderBy(desc(creatorDnaVersions.version));
    const traits = versions.length
      ? await database
          .select({
            id: dnaTraits.id,
            dnaVersionId: dnaTraits.dnaVersionId,
            category: dnaTraits.category,
            label: dnaTraits.label,
            value: dnaTraits.value,
            confidence: dnaTraits.confidence,
            evidence: dnaTraits.evidence,
            position: dnaTraits.position,
            createdAt: dnaTraits.createdAt,
          })
          .from(dnaTraits)
          .where(
            inArray(
              dnaTraits.dnaVersionId,
              versions.map((version) => version.id),
            ),
          )
          .orderBy(asc(dnaTraits.position))
      : [];
    return {
      profile,
      versions: versions.map((version) => ({
        ...version,
        traits: traits.filter((trait) => trait.dnaVersionId === version.id),
      })),
    };
  }

  private async buildProjectsExport(workspaceId: string) {
    const database = this.requireDatabase();
    const projectRows = await database
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.updatedAt));
    if (!projectRows.length) return [];
    const projectIds = projectRows.map((project) => project.id);
    const [versions, scriptRows, storyboardRows] = await Promise.all([
      database
        .select()
        .from(projectVersions)
        .where(inArray(projectVersions.projectId, projectIds))
        .orderBy(asc(projectVersions.version)),
      database
        .select()
        .from(scripts)
        .where(inArray(scripts.projectId, projectIds))
        .orderBy(desc(scripts.updatedAt)),
      database
        .select()
        .from(storyboards)
        .where(inArray(storyboards.projectId, projectIds))
        .orderBy(desc(storyboards.updatedAt)),
    ]);
    const scenes = storyboardRows.length
      ? await database
          .select()
          .from(storyboardScenes)
          .where(
            inArray(
              storyboardScenes.storyboardId,
              storyboardRows.map((storyboard) => storyboard.id),
            ),
          )
          .orderBy(asc(storyboardScenes.position))
      : [];
    return projectRows.map((project) => ({
      ...project,
      versions: versions.filter((version) => version.projectId === project.id),
      scripts: scriptRows.filter((script) => script.projectId === project.id),
      storyboards: storyboardRows
        .filter((storyboard) => storyboard.projectId === project.id)
        .map((storyboard) => ({
          ...storyboard,
          scenes: scenes.filter(
            (scene) => scene.storyboardId === storyboard.id,
          ),
        })),
    }));
  }

  private async buildWorkspaceExport(workspaceId: string) {
    const database = this.requireDatabase();
    const [
      sources,
      analyses,
      memories,
      opportunityRows,
      jobs,
      generated,
      exportRows,
      accounts,
      ledger,
      feedback,
      audits,
      integrations,
    ] = await Promise.all([
      database
        .select()
        .from(sourceAssets)
        .where(eq(sourceAssets.workspaceId, workspaceId)),
      database
        .select({ analysis: assetAnalyses })
        .from(assetAnalyses)
        .innerJoin(
          sourceAssets,
          eq(assetAnalyses.sourceAssetId, sourceAssets.id),
        )
        .where(eq(sourceAssets.workspaceId, workspaceId)),
      database
        .select()
        .from(memoryCandidates)
        .where(eq(memoryCandidates.workspaceId, workspaceId)),
      database
        .select()
        .from(opportunities)
        .where(eq(opportunities.workspaceId, workspaceId)),
      database
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.workspaceId, workspaceId)),
      database
        .select()
        .from(generatedAssets)
        .where(eq(generatedAssets.workspaceId, workspaceId)),
      database
        .select()
        .from(projectExports)
        .where(eq(projectExports.workspaceId, workspaceId)),
      database
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.workspaceId, workspaceId)),
      database
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.workspaceId, workspaceId)),
      database
        .select()
        .from(feedbackEvents)
        .where(eq(feedbackEvents.workspaceId, workspaceId)),
      database
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.workspaceId, workspaceId)),
      database
        .select()
        .from(socialConnections)
        .where(eq(socialConnections.workspaceId, workspaceId)),
    ]);
    return {
      sourceAssets: sources,
      assetAnalyses: analyses.map((row) => row.analysis),
      memoryCandidates: memories,
      opportunities: opportunityRows,
      generationJobs: jobs,
      generatedAssets: generated,
      exports: exportRows,
      creditAccounts: accounts,
      creditLedger: ledger,
      feedbackEvents: feedback,
      auditEvents: audits,
      socialConnections: integrations,
      mediaNotice:
        "This JSON contains portable metadata. Private media binaries remain available from the library.",
    };
  }

  private async findScheduledDeletion(
    workspaceId: string,
  ): Promise<AccountDeletionRecord | null> {
    const [row] = await this.requireDatabase()
      .select(deletionSelection)
      .from(accountDeletionRequests)
      .where(
        and(
          eq(accountDeletionRequests.workspaceId, workspaceId),
          eq(accountDeletionRequests.status, "scheduled"),
        ),
      )
      .limit(1);
    return this.toDeletion(row);
  }

  private toDeletion(
    row:
      | {
          id: string;
          status: string;
          requestedAt: Date;
          scheduledFor: Date;
        }
      | undefined,
  ): AccountDeletionRecord | null {
    if (!row || row.status !== "scheduled") return null;
    return { ...row, status: "scheduled" };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
