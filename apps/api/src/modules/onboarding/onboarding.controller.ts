import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type {
  OnboardingCalibrationSet,
  OnboardingState,
  SubmitOnboardingCalibrationResponsesResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { OnboardingService } from "./onboarding.service.js";
import { SubmitOnboardingCalibrationResponsesDto } from "./submit-onboarding-calibration-responses.dto.js";
import { UpdateOnboardingAssetDto } from "./update-onboarding-asset.dto.js";
import { UpdateOnboardingProfileDto } from "./update-onboarding-profile.dto.js";

@ApiTags("onboarding")
@ApiBearerAuth()
@Controller({ path: "onboarding", version: "1" })
export class OnboardingController {
  constructor(
    @Inject(OnboardingService)
    private readonly onboarding: OnboardingService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the persisted onboarding workspace" })
  @ApiOkResponse({ description: "Current upload, analysis and profile state" })
  get(@CurrentUser() principal: AuthPrincipal): Promise<OnboardingState> {
    return this.onboarding.get(principal);
  }

  @Post("assets/:assetId/analyze")
  @ApiOperation({ summary: "Analyze one private source with Vertex AI" })
  analyzeAsset(
    @CurrentUser() principal: AuthPrincipal,
    @Param("assetId") assetId: string,
  ): Promise<OnboardingState> {
    return this.onboarding.analyzeAsset(principal, assetId);
  }

  @Patch("assets/:assetId")
  @ApiOperation({ summary: "Label how representative a source is" })
  updateAsset(
    @CurrentUser() principal: AuthPrincipal,
    @Param("assetId") assetId: string,
    @Body() input: UpdateOnboardingAssetDto,
  ): Promise<OnboardingState> {
    return this.onboarding.updateAsset(principal, assetId, input);
  }

  @Post("profile/draft")
  @ApiOperation({
    summary: "Build an editable Creator DNA from source evidence",
  })
  buildProfile(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<OnboardingState> {
    return this.onboarding.buildProfile(principal);
  }

  @Put("profile")
  @ApiOperation({ summary: "Save Creator DNA edits and complete onboarding" })
  complete(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: UpdateOnboardingProfileDto,
  ): Promise<OnboardingState> {
    return this.onboarding.complete(principal, input);
  }

  @Post("calibration")
  @ApiOperation({
    summary: "Generate six calibration mini-concepts from Creator DNA",
  })
  generateCalibration(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<OnboardingCalibrationSet> {
    return this.onboarding.generateCalibration(principal);
  }

  @Post("calibration/responses")
  @ApiOperation({
    summary: "Save calibration responses as memory candidate signal",
  })
  submitCalibrationResponses(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: SubmitOnboardingCalibrationResponsesDto,
  ): Promise<SubmitOnboardingCalibrationResponsesResult> {
    return this.onboarding.submitCalibrationResponses(principal, input);
  }
}
