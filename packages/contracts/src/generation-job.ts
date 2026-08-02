import { z } from "zod";

export const GenerationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
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
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;
