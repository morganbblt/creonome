import { z } from "zod";

export const CreatorDnaTraitSchema = z.object({
  id: z.uuid(),
  category: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  evidence: z.record(z.string(), z.unknown()),
});

export const CreatorDnaSchema = z.object({
  version: z.number().int().positive(),
  summary: z.string().min(12),
  confirmed: z.boolean(),
  traits: z.array(CreatorDnaTraitSchema),
});

export type CreatorDna = z.infer<typeof CreatorDnaSchema>;
export type CreatorDnaTrait = z.infer<typeof CreatorDnaTraitSchema>;
