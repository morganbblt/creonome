import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type {
  AccountDeletionCancellation,
  AccountDeletionRequest,
  PrivacyExport,
  PrivacyPreferences,
  PrivacyState,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { InternalJobAuthGuard } from "../auth/internal-job-auth.guard.js";
import { Public } from "../auth/public.decorator.js";
import { CreateAccountDeletionDto } from "./create-account-deletion.dto.js";
import { CreatePrivacyExportDto } from "./create-privacy-export.dto.js";
import type { AccountDeletionExecutionSummary } from "./privacy.service.js";
import { PrivacyService } from "./privacy.service.js";
import { UpdatePrivacyPreferencesDto } from "./update-privacy-preferences.dto.js";

@ApiTags("privacy")
@ApiBearerAuth()
@Controller({ path: "privacy", version: "1" })
export class PrivacyController {
  constructor(
    @Inject(PrivacyService) private readonly privacy: PrivacyService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get workspace privacy state" })
  @ApiOkResponse({ description: "Preferences and scheduled deletion state" })
  getState(@CurrentUser() principal: AuthPrincipal): Promise<PrivacyState> {
    return this.privacy.getState(principal);
  }

  @Put("preferences")
  @ApiOperation({ summary: "Update workspace privacy preferences" })
  @ApiOkResponse({ description: "Persisted privacy preferences" })
  updatePreferences(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: UpdatePrivacyPreferencesDto,
  ): Promise<PrivacyPreferences> {
    return this.privacy.updatePreferences(principal, input);
  }

  @Post("exports")
  @ApiOperation({ summary: "Create a portable workspace JSON export" })
  @ApiCreatedResponse({ description: "Immediate JSON download payload" })
  createExport(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: CreatePrivacyExportDto,
  ): Promise<PrivacyExport> {
    return this.privacy.createExport(principal, input);
  }

  @Post("account-deletion")
  @ApiOperation({ summary: "Schedule workspace account deletion" })
  @ApiCreatedResponse({ description: "Annulable 24-hour deletion request" })
  scheduleAccountDeletion(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: CreateAccountDeletionDto,
  ): Promise<AccountDeletionRequest> {
    return this.privacy.scheduleAccountDeletion(principal, input);
  }

  @Delete("account-deletion/:id")
  @ApiOperation({ summary: "Cancel a scheduled account deletion" })
  @ApiOkResponse({ description: "Confirmed cancellation receipt" })
  cancelAccountDeletion(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) requestId: string,
  ): Promise<AccountDeletionCancellation> {
    return this.privacy.cancelAccountDeletion(principal, requestId);
  }

  @Public()
  @UseGuards(InternalJobAuthGuard)
  @Post("account-deletion/execute-due")
  @ApiOperation({
    summary:
      "Execute every account deletion past its grace period (internal only)",
  })
  @ApiOkResponse({ description: "Summary of processed deletion requests" })
  executeDueAccountDeletions(): Promise<AccountDeletionExecutionSummary> {
    return this.privacy.executeDueAccountDeletions();
  }
}
