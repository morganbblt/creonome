import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseApiEnv } from "@creonome/config";
import { HealthModule } from "./health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CreatorDnaModule } from "./modules/creator-dna/creator-dna.module.js";
import { CreditsModule } from "./modules/credits/credits.module.js";
import { DatabaseModule } from "./modules/database/database.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { MemoryModule } from "./modules/memory/memory.module.js";
import { IntegrationsModule } from "./modules/integrations/integrations.module.js";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module.js";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module.js";
import { UploadsModule } from "./modules/uploads/uploads.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: (config) => parseApiEnv(config),
    }),
    AuthModule,
    CreatorDnaModule,
    CreditsModule,
    DatabaseModule,
    JobsModule,
    MemoryModule,
    IntegrationsModule,
    WorkspacesModule,
    OpportunitiesModule,
    UploadsModule,
    HealthModule,
  ],
})
export class AppModule {}
