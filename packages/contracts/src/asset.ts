import { z } from "zod";

export const LibraryItemKindSchema = z.enum([
  "video",
  "audio",
  "image",
  "document",
  "script",
  "export",
]);

export const LibraryItemSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid().nullable(),
  name: z.string().trim().min(1).max(240),
  kind: LibraryItemKindSchema,
  mimeType: z.string().trim().min(1).max(120).nullable(),
  byteSize: z.number().int().nonnegative().nullable(),
  durationSeconds: z.number().int().positive().max(86_400).nullable(),
  status: z.enum(["uploaded", "analyzing", "ready", "failed"]),
  source: z.enum(["upload", "generated", "script"]),
  createdAt: z.iso.datetime(),
});

export const LibrarySchema = z.object({
  items: z.array(LibraryItemSchema),
  totalByteSize: z.number().int().nonnegative(),
});

export const CreateAssetInputSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().min(1).max(120),
  byteSize: z.number().int().positive().max(500_000_000),
  gcsUri: z.string().startsWith("gs://").max(1_024),
  checksumSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .nullable()
    .optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;
export type Library = z.infer<typeof LibrarySchema>;
export type LibraryItem = z.infer<typeof LibraryItemSchema>;
export type LibraryItemKind = z.infer<typeof LibraryItemKindSchema>;
