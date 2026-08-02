import { z } from "zod";

export const CreatorDnaTraitSchema = z.object({
  id: z.uuid(),
  category: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  evidence: z.record(z.string(), z.unknown()),
});

export const CreatorDnaReferenceImageSchema = z.object({
  id: z.uuid(),
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

export const CreatorDnaSchema = z.object({
  version: z.number().int().positive(),
  summary: z.string().min(12),
  confirmed: z.boolean(),
  traits: z.array(CreatorDnaTraitSchema),
  peopleReferenceImage: CreatorDnaReferenceImageSchema.nullable().optional(),
});

export const SetCreatorDnaReferenceImageInputSchema = z.object({
  assetId: z.uuid(),
});

export const UpdateCreatorDnaTraitInputSchema = z.object({
  value: z.string().trim().min(1).max(500),
});

export type CreatorDna = z.infer<typeof CreatorDnaSchema>;
export type CreatorDnaReferenceImage = z.infer<
  typeof CreatorDnaReferenceImageSchema
>;
export type CreatorDnaTrait = z.infer<typeof CreatorDnaTraitSchema>;
export type SetCreatorDnaReferenceImageInput = z.infer<
  typeof SetCreatorDnaReferenceImageInputSchema
>;
export type UpdateCreatorDnaTraitInput = z.infer<
  typeof UpdateCreatorDnaTraitInputSchema
>;
