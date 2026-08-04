import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountDeletionCancellationSchema,
  AccountDeletionRequestInputSchema,
  AccountDeletionRequestSchema,
  PrivacyExportInputSchema,
  PrivacyExportSchema,
  PrivacyPreferencesSchema,
  PrivacyStateSchema,
  UpdatePrivacyPreferencesInputSchema,
  type AccountDeletionCancellation,
  type AccountDeletionRequest,
  type AccountDeletionRequestInput,
  type PrivacyExport,
  type PrivacyExportInput,
  type PrivacyPreferences,
  type PrivacyState,
  type UpdatePrivacyPreferencesInput,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import {
  PRIVATE_OBJECT_STORE,
  type PrivateObjectStore,
} from "../uploads/private-object-store.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  PRIVACY_REPOSITORY,
  type AccountDeletionRecord,
  type PrivacyPreferencesRecord,
  type PrivacyRepository,
} from "./privacy.repository.js";

const deletionDelayMs = 24 * 60 * 60 * 1_000;

export type AccountDeletionExecutionSummary = {
  processed: number;
  executed: string[];
  failed: string[];
};

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PRIVACY_REPOSITORY)
    private readonly repository: PrivacyRepository,
    @Inject(PRIVATE_OBJECT_STORE)
    private readonly objectStore: PrivateObjectStore,
  ) {}

  async getState(principal: AuthPrincipal): Promise<PrivacyState> {
    const context = await this.workspaces.resolve(principal);
    const state = await this.repository.getState(context.workspaceId);
    return PrivacyStateSchema.parse({
      preferences: this.toPreferences(state.preferences),
      accountDeletion: state.accountDeletion
        ? this.toDeletion(state.accountDeletion)
        : null,
    });
  }

  async updatePreferences(
    principal: AuthPrincipal,
    rawInput: UpdatePrivacyPreferencesInput,
  ): Promise<PrivacyPreferences> {
    const input = UpdatePrivacyPreferencesInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    const preferences = await this.repository.updatePreferences({
      ...input,
      workspaceId: context.workspaceId,
      userId: context.userId,
    });
    return this.toPreferences(preferences);
  }

  async createExport(
    principal: AuthPrincipal,
    rawInput: PrivacyExportInput,
  ): Promise<PrivacyExport> {
    const input = PrivacyExportInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    const createdAt = new Date();
    const data = await this.repository.buildExport(
      context.workspaceId,
      input.kind,
      context.userId,
    );
    const date = createdAt.toISOString().slice(0, 10);
    const label = input.kind === "creator_dna" ? "creator-dna" : input.kind;
    return PrivacyExportSchema.parse({
      kind: input.kind,
      fileName: `creonome-${label}-${date}.json`,
      mimeType: "application/json;charset=utf-8",
      content: JSON.stringify(data, null, 2),
      createdAt: createdAt.toISOString(),
    });
  }

  async scheduleAccountDeletion(
    principal: AuthPrincipal,
    rawInput: AccountDeletionRequestInput,
  ): Promise<AccountDeletionRequest> {
    AccountDeletionRequestInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    if (
      !(await this.repository.isWorkspaceOwner(
        context.workspaceId,
        context.userId,
      ))
    ) {
      throw new ForbiddenException(
        "Only the workspace owner can delete this account",
      );
    }
    const record = await this.repository.scheduleAccountDeletion({
      workspaceId: context.workspaceId,
      userId: context.userId,
      scheduledFor: new Date(Date.now() + deletionDelayMs),
    });
    return this.toDeletion(record);
  }

  async cancelAccountDeletion(
    principal: AuthPrincipal,
    requestId: string,
  ): Promise<AccountDeletionCancellation> {
    const context = await this.workspaces.resolve(principal);
    if (
      !(await this.repository.isWorkspaceOwner(
        context.workspaceId,
        context.userId,
      ))
    ) {
      throw new ForbiddenException(
        "Only the workspace owner can cancel account deletion",
      );
    }
    const cancelled = await this.repository.cancelAccountDeletion(
      context.workspaceId,
      requestId,
      context.userId,
    );
    if (!cancelled) {
      throw new NotFoundException("Scheduled account deletion was not found");
    }
    return AccountDeletionCancellationSchema.parse({
      id: requestId,
      cancelled: true,
    });
  }

  /**
   * Executes every scheduled account deletion whose grace period has
   * elapsed. Intended for a trusted internal caller only (see
   * `InternalJobAuthGuard`); there is no per-user authorization here because
   * there is no acting user — it processes all due workspaces in one pass.
   *
   * Each request is handled independently: a failure partway through one
   * workspace's cleanup (most likely a GCS error) leaves that request
   * `scheduled` for a future retry instead of aborting the whole batch, and
   * whatever rows were already deleted stay deleted so the retry only has
   * to finish the remainder.
   */
  async executeDueAccountDeletions(): Promise<AccountDeletionExecutionSummary> {
    const due = await this.repository.findDueAccountDeletions(new Date());
    const executed: string[] = [];
    const failed: string[] = [];

    for (const request of due) {
      try {
        await this.deleteWorkspaceData(request.workspaceId);
        await this.repository.markAccountDeletionExecuted(
          request.id,
          request.workspaceId,
        );
        executed.push(request.id);
      } catch (error) {
        failed.push(request.id);
        this.logger.error(
          `Account deletion execution failed for request ${request.id} (workspace ${request.workspaceId}); leaving it scheduled for retry`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { processed: due.length, executed, failed };
  }

  /**
   * Deletes a workspace's creative data. Source assets are removed from GCS
   * before their database row so a failed object-store delete leaves the
   * row (and therefore the retry target) intact. credit_ledger and
   * credit_accounts rows are intentionally never touched here.
   */
  private async deleteWorkspaceData(workspaceId: string): Promise<void> {
    const sourceAssets =
      await this.repository.listWorkspaceSourceAssets(workspaceId);
    for (const asset of sourceAssets) {
      await this.objectStore.deleteObject(asset.gcsUri);
      await this.repository.deleteWorkspaceSourceAsset(workspaceId, asset.id);
    }
    await this.repository.deleteWorkspaceCreatorDna(workspaceId);
    await this.repository.deleteWorkspaceProjects(workspaceId);
  }

  private toPreferences(record: PrivacyPreferencesRecord): PrivacyPreferences {
    return PrivacyPreferencesSchema.parse({
      ...record,
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDeletion(record: AccountDeletionRecord): AccountDeletionRequest {
    return AccountDeletionRequestSchema.parse({
      ...record,
      requestedAt: record.requestedAt.toISOString(),
      scheduledFor: record.scheduledFor.toISOString(),
    });
  }
}
