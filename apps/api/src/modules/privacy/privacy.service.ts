import {
  ForbiddenException,
  Inject,
  Injectable,
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
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  PRIVACY_REPOSITORY,
  type AccountDeletionRecord,
  type PrivacyPreferencesRecord,
  type PrivacyRepository,
} from "./privacy.repository.js";

const deletionDelayMs = 24 * 60 * 60 * 1_000;

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PRIVACY_REPOSITORY)
    private readonly repository: PrivacyRepository,
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
