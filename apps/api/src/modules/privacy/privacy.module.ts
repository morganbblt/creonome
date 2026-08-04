import { Module } from "@nestjs/common";
import { UploadsModule } from "../uploads/uploads.module.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { NeonPrivacyRepository } from "./neon-privacy.repository.js";
import { PrivacyController } from "./privacy.controller.js";
import { PRIVACY_REPOSITORY } from "./privacy.repository.js";
import { PrivacyService } from "./privacy.service.js";

@Module({
  imports: [WorkspacesModule, UploadsModule],
  controllers: [PrivacyController],
  providers: [
    PrivacyService,
    NeonPrivacyRepository,
    { provide: PRIVACY_REPOSITORY, useExisting: NeonPrivacyRepository },
  ],
})
export class PrivacyModule {}
