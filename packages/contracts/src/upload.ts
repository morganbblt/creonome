import { z } from "zod";

export const UploadSignResponseSchema = z.object({
  objectName: z.string().min(1),
  gcsUri: z.string().startsWith("gs://"),
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
  headers: z.record(z.string(), z.string()),
});

export type UploadSignResponse = z.infer<typeof UploadSignResponseSchema>;
