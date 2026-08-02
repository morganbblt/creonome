import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { MemoryCandidatesService } from "./memory-candidates.service.js";

@ApiTags("memory")
@ApiBearerAuth()
@Controller({ path: "memory-candidates", version: "1" })
export class MemoryCandidatesController {
  constructor(
    @Inject(MemoryCandidatesService)
    private readonly candidates: MemoryCandidatesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List pending memory candidates and review history",
  })
  list(@CurrentUser() principal: AuthPrincipal) {
    return this.candidates.list(principal);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve a memory candidate and send it to Mem0" })
  approve(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.candidates.approve(principal, id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject a memory candidate without sending it" })
  reject(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.candidates.reject(principal, id);
  }
}
