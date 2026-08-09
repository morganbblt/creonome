import {
  Controller,
  Delete,
  Get,
  Inject,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { IntegrationsService } from "./integrations.service.js";

@ApiTags("integrations")
@ApiBearerAuth()
@Controller({ path: "integrations", version: "1" })
export class IntegrationsController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrations: IntegrationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List TikTok and Instagram connection status" })
  list(@CurrentUser() principal: AuthPrincipal) {
    return this.integrations.list(principal);
  }

  @Get("tiktok/start")
  @ApiOperation({
    summary:
      "Start the TikTok OAuth authorization flow (behind FEATURE_SOCIAL_CONNECTIONS)",
  })
  startTikTok(): { url: string } {
    return this.integrations.startTikTok();
  }

  @Get("instagram/start")
  @ApiOperation({
    summary: "Instagram OAuth placeholder pending app credentials",
  })
  startInstagram(): never {
    throw new ServiceUnavailableException(
      "Instagram OAuth requires the Creonome Meta app credentials and final callback domain",
    );
  }

  @Get("tiktok/callback")
  callbackTikTok(): never {
    throw new NotImplementedException(
      "TikTok OAuth callback is not enabled yet",
    );
  }

  @Get("instagram/callback")
  callbackInstagram(): never {
    throw new NotImplementedException(
      "Instagram OAuth callback is not enabled yet",
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Disconnect a social account" })
  disconnect(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.integrations.disconnect(principal, id);
  }
}
