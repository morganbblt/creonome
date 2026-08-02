import { Inject, Injectable } from "@nestjs/common";
import {
  CreateProjectExportInputSchema,
  ProjectExportSchema,
  type CreateProjectExportInput,
  type ProjectExport,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { ProjectsService } from "../projects/projects.service.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  EXPORTS_REPOSITORY,
  type ExportsRepository,
} from "./exports.repository.js";
import {
  buildProjectMarkdown,
  projectExportFileName,
} from "./project-markdown.js";

@Injectable()
export class ExportsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(ProjectsService)
    private readonly projects: ProjectsService,
    @Inject(EXPORTS_REPOSITORY)
    private readonly repository: ExportsRepository,
  ) {}

  async create(
    principal: AuthPrincipal,
    projectId: string,
    rawInput: CreateProjectExportInput,
  ): Promise<ProjectExport> {
    const input = CreateProjectExportInputSchema.parse(rawInput);
    const [project, context] = await Promise.all([
      this.projects.get(principal, projectId),
      this.workspaces.resolve(principal),
    ]);
    const record = await this.repository.createCompleted({
      workspaceId: context.workspaceId,
      projectId: project.id,
      userId: context.userId,
      format: input.format,
    });

    return ProjectExportSchema.parse({
      id: record.id,
      projectId: project.id,
      format: input.format,
      status: "ready",
      fileName: projectExportFileName(project.title),
      mimeType: "text/markdown;charset=utf-8",
      content: buildProjectMarkdown(project),
      createdAt: record.createdAt.toISOString(),
    });
  }
}
