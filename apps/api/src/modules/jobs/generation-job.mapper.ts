import { GenerationJobSchema, type GenerationJob } from "@creonome/contracts";
import type { JobRecord } from "./jobs.repository.js";

export function toGenerationJobContract(job: JobRecord): GenerationJob {
  return GenerationJobSchema.parse({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  });
}
