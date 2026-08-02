import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { GcsUploadSigner } from "./gcs-upload.signer.js";
import { UPLOAD_SIGNER } from "./upload-signer.js";
import { UnavailableUploadSigner } from "./unavailable-upload.signer.js";
import { UploadsController } from "./uploads.controller.js";
import { UploadsService } from "./uploads.service.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: UPLOAD_SIGNER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const bucket = config.get<string>("GCP_MEDIA_BUCKET");
        return bucket
          ? new GcsUploadSigner(
              bucket,
              config.get<string>("GOOGLE_CLOUD_PROJECT") ?? "creonome",
            )
          : new UnavailableUploadSigner();
      },
    },
  ],
})
export class UploadsModule {}
