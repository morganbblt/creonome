import { z } from "zod";

export const ScriptPlatformSchema = z.enum(["tiktok", "instagram", "youtube"]);

export const ScriptDraftSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string().trim().min(3).max(160),
  hook: z.string().trim().min(3).max(220),
  body: z.string().trim().min(12).max(4_000),
  callToAction: z.string().trim().min(3).max(220).nullable(),
  caption: z.string().trim().min(3).max(2_200).nullable(),
  platforms: z.array(ScriptPlatformSchema).min(1),
  durationSeconds: z.number().int().positive().max(600).nullable(),
});

export type ScriptDraft = z.infer<typeof ScriptDraftSchema>;
export type ScriptPlatform = z.infer<typeof ScriptPlatformSchema>;
