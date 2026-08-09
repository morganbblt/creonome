import { z } from "zod";
import { OnboardingAssetInsightSchema } from "./onboarding.js";

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
  source: z.enum(["upload", "generated", "script", "export"]),
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

export const AssetDeletionSchema = z.object({
  id: z.uuid(),
  deleted: z.literal(true),
});

/**
 * `GET /assets/:id` (P2.4 asset detail route): the same fields as a
 * `LibraryItem`, plus the latest analysis evidence for this asset, if any
 * has run. Reuses {@link OnboardingAssetInsightSchema} rather than a
 * separate shape -- `asset_analyses` rows are keyed only by
 * `source_asset_id` (packages/db/src/schema/index.ts), not by which flow
 * triggered the analysis, so the onboarding pipeline's analysis of an
 * uploaded source and this detail route's reading of it are the same
 * record. `null` covers both "not analyzed yet" and "analysis failed to
 * parse" -- the detail page doesn't need to distinguish those from here.
 */
export const AssetDetailSchema = LibraryItemSchema.extend({
  analysis: OnboardingAssetInsightSchema.nullable(),
});

export type AssetDeletion = z.infer<typeof AssetDeletionSchema>;
export type AssetDetail = z.infer<typeof AssetDetailSchema>;
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;
export type Library = z.infer<typeof LibrarySchema>;
export type LibraryItem = z.infer<typeof LibraryItemSchema>;
export type LibraryItemKind = z.infer<typeof LibraryItemKindSchema>;
