import {
  Body,
  Controller,
  Get,
  Inject,
  NotImplementedException,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CreditsService } from "./credits.service.js";
import { EstimateCreditsDto } from "./estimate-credits.dto.js";

@ApiTags("credits")
@ApiBearerAuth()
@Controller({ path: "credits", version: "1" })
export class CreditsController {
  constructor(
    @Inject(CreditsService) private readonly credits: CreditsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the synthetic credit account" })
  getAccount(@CurrentUser() principal: AuthPrincipal) {
    return this.credits.getAccount(principal);
  }

  @Get("ledger")
  @ApiOperation({ summary: "Get the credit ledger" })
  listLedger(@CurrentUser() principal: AuthPrincipal) {
    return this.credits.listLedger(principal);
  }

  @Post("estimate")
  @ApiOperation({ summary: "Estimate a generation cost without reserving it" })
  estimate(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: EstimateCreditsDto,
  ) {
    return this.credits.estimate(principal, input.kind);
  }

  @Post("purchase")
  @ApiOperation({ summary: "Disabled hackathon billing placeholder" })
  purchase(): never {
    throw new NotImplementedException(
      "Credit purchases are disabled during the hackathon",
    );
  }
}
