import { z } from "zod";
import { CreditsResponseSchema } from "./credits.js";

export const GenerationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "failed_retryable",
  "failed_final",
  "cancelled",
]);

export const GenerationJobSchema = z.object({
  id: z.uuid(),
  kind: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  status: GenerationJobStatusSchema,
  progress: z.number().int().min(0).max(100),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable().optional(),
  /**
   * The project this job is (or will be) attached to, once known. Lets a
   * client polling GET /jobs/:id find the finished deliverable once the
   * job succeeds without hardcoding a kind → resource mapping.
   */
  projectId: z.uuid().nullable().optional(),
});

/**
 * Returned immediately by generation-triggering endpoints once the work has
 * been handed off to the Cloud Tasks queue instead of running inline. The
 * client polls `GET /api/v1/jobs/:id` (or re-fetches the parent resource)
 * until the job reaches a terminal status.
 */
export const QueuedGenerationJobSchema = z.object({
  job: GenerationJobSchema,
  credits: CreditsResponseSchema,
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;
export type QueuedGenerationJob = z.infer<typeof QueuedGenerationJobSchema>;
