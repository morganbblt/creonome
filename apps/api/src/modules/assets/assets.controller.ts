import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Library, LibraryItem } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { AssetsService } from "./assets.service.js";
import { CreateAssetDto } from "./create-asset.dto.js";

@ApiTags("assets")
@ApiBearerAuth()
@Controller({ path: "assets", version: "1" })
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  @Get()
  @ApiOperation({ summary: "List private workspace library items" })
  @ApiOkResponse({ description: "Uploads, generated exports and scripts" })
  list(@CurrentUser() principal: AuthPrincipal): Promise<Library> {
    return this.assets.list(principal);
  }

  @Post()
  @ApiOperation({ summary: "Register a completed private GCS upload" })
  @ApiCreatedResponse({ description: "The idempotently registered asset" })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: CreateAssetDto,
  ): Promise<LibraryItem> {
    return this.assets.create(principal, input);
  }
}
