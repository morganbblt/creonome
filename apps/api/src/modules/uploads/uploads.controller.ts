import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { UploadSignResponse } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SignUploadDto } from "./sign-upload.dto.js";
import { UploadsService } from "./uploads.service.js";

@ApiTags("uploads")
@ApiBearerAuth()
@Controller({ path: "uploads", version: "1" })
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploads: UploadsService) {}

  @Post("sign")
  @ApiOperation({ summary: "Create a 15-minute private GCS upload URL" })
  sign(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: SignUploadDto,
  ): Promise<UploadSignResponse> {
    return this.uploads.sign(principal, input);
  }
}
