import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { Mem0MemoryProvider } from "./mem0-memory.provider.js";
import { MemoryCandidatesController } from "./memory-candidates.controller.js";
import { MemoryCandidatesService } from "./memory-candidates.service.js";
import { MEMORY_CANDIDATE_REPOSITORY } from "./memory-candidate.repository.js";
import { MEMORY_PROVIDER } from "./memory-provider.js";
import { NeonMemoryCandidateRepository } from "./neon-memory-candidate.repository.js";
import { UnavailableMemoryProvider } from "./unavailable-memory.provider.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [MemoryCandidatesController],
  providers: [
    MemoryCandidatesService,
    NeonMemoryCandidateRepository,
    {
      provide: MEMORY_CANDIDATE_REPOSITORY,
      useExisting: NeonMemoryCandidateRepository,
    },
    {
      provide: MEMORY_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("MEM0_API_KEY");
        return apiKey
          ? new Mem0MemoryProvider({
              apiKey,
              baseUrl: config.get<string>("MEM0_BASE_URL"),
            })
          : new UnavailableMemoryProvider();
      },
    },
  ],
  exports: [MEMORY_PROVIDER],
})
export class MemoryModule {}
