import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("creonome-api"),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
