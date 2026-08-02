import { z } from "zod";

export const ProjectLevelSchema = z.enum([
  "idea",
  "script",
  "storyboard",
  "video",
]);

export const ProjectSchema = z.object({
  id: z.uuid(),
  opportunityId: z.uuid().nullable(),
  title: z.string().trim().min(3).max(160),
  status: z.enum(["active", "archived"]),
  currentLevel: ProjectLevelSchema,
  currentVersion: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectLevel = z.infer<typeof ProjectLevelSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;
