import { z } from "zod";

export const ProjectExportFormatSchema = z.literal("markdown");

export const CreateProjectExportInputSchema = z.object({
  format: ProjectExportFormatSchema,
});

export const ProjectExportSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  format: ProjectExportFormatSchema,
  status: z.literal("ready"),
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.literal("text/markdown;charset=utf-8"),
  content: z.string().min(1).max(250_000),
  createdAt: z.iso.datetime(),
});

export type CreateProjectExportInput = z.infer<
  typeof CreateProjectExportInputSchema
>;
export type ProjectExport = z.infer<typeof ProjectExportSchema>;
export type ProjectExportFormat = z.infer<typeof ProjectExportFormatSchema>;
