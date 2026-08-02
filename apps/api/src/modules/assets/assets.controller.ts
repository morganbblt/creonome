import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AssetDeletion, Library, LibraryItem } from "@creonome/contracts";
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

  @Get(":id")
  @ApiOperation({ summary: "Get one private uploaded source" })
  @ApiOkResponse({ description: "Workspace-scoped source metadata" })
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) assetId: string,
  ): Promise<LibraryItem> {
    return this.assets.get(principal, assetId);
  }

  @Get(":id/content")
  @ApiOperation({ summary: "Stream one private image source" })
  async content(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) assetId: string,
  ): Promise<StreamableFile> {
    const content = await this.assets.readContent(principal, assetId);
    return new StreamableFile(content.bytes, {
      type: content.mimeType,
      length: content.bytes.byteLength,
    });
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

  @Delete(":id")
  @ApiOperation({ summary: "Delete one private source and its analyses" })
  @ApiOkResponse({ description: "Confirmed source deletion receipt" })
  remove(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) assetId: string,
  ): Promise<AssetDeletion> {
    return this.assets.remove(principal, assetId);
  }
}
