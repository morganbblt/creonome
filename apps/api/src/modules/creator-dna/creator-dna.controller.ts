import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
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
import type { CreatorDna } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CreatorDnaService } from "./creator-dna.service.js";
import { SetCreatorDnaReferenceImageDto } from "./set-reference-image.dto.js";
import { UpdateCreatorDnaTraitDto } from "./update-trait.dto.js";

@ApiTags("creator DNA")
@ApiBearerAuth()
@Controller({ path: "creator-dna", version: "1" })
export class CreatorDnaController {
  constructor(
    @Inject(CreatorDnaService)
    private readonly creatorDna: CreatorDnaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the current Creator DNA" })
  @ApiOkResponse({ description: "Current evidence-backed DNA version" })
  getCurrent(@CurrentUser() principal: AuthPrincipal): Promise<CreatorDna> {
    return this.creatorDna.getCurrent(principal);
  }

  @Patch("traits/:traitId")
  @ApiOperation({ summary: "Correct one Creator DNA trait" })
  updateTrait(
    @CurrentUser() principal: AuthPrincipal,
    @Param("traitId", new ParseUUIDPipe()) traitId: string,
    @Body() input: UpdateCreatorDnaTraitDto,
  ): Promise<CreatorDna> {
    return this.creatorDna.updateTrait(principal, traitId, input.value);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm the current Creator DNA" })
  confirm(@CurrentUser() principal: AuthPrincipal): Promise<CreatorDna> {
    return this.creatorDna.confirm(principal);
  }

  @Put("reference-image")
  @ApiOperation({ summary: "Set the people reference image for Veo" })
  setReferenceImage(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: SetCreatorDnaReferenceImageDto,
  ): Promise<CreatorDna> {
    return this.creatorDna.setPeopleReferenceImage(principal, input.assetId);
  }

  @Delete("reference-image")
  @ApiOperation({ summary: "Remove the people reference image for Veo" })
  clearReferenceImage(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<CreatorDna> {
    return this.creatorDna.clearPeopleReferenceImage(principal);
  }

  @Get("versions")
  @ApiOperation({ summary: "List Creator DNA versions" })
  listVersions(@CurrentUser() principal: AuthPrincipal) {
    return this.creatorDna.listVersions(principal);
  }
}
