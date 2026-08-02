import { Controller, Get, Inject, Post } from "@nestjs/common";
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

  @Post("confirm")
  @ApiOperation({ summary: "Confirm the current Creator DNA" })
  confirm(@CurrentUser() principal: AuthPrincipal): Promise<CreatorDna> {
    return this.creatorDna.confirm(principal);
  }

  @Get("versions")
  @ApiOperation({ summary: "List Creator DNA versions" })
  listVersions(@CurrentUser() principal: AuthPrincipal) {
    return this.creatorDna.listVersions(principal);
  }
}
