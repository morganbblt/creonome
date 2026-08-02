import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ProjectDetailSchema,
  ProjectListSchema,
  type ProjectDetail,
  type ProjectList,
  type ProjectSummary,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  PROJECTS_REPOSITORY,
  type ProjectDetailRecord,
  type ProjectSummaryRecord,
  type ProjectsRepository,
} from "./projects.repository.js";

const levelRank = {
  idea: 0,
  script: 1,
  storyboard: 2,
  video: 3,
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PROJECTS_REPOSITORY)
    private readonly repository: ProjectsRepository,
  ) {}

  async list(principal: AuthPrincipal): Promise<ProjectList> {
    const context = await this.workspaces.resolve(principal);
    const rows = await this.repository.list(context.workspaceId);
    return ProjectListSchema.parse({
      projects: rows.map((row) => this.toSummary(row)),
    });
  }

  async get(
    principal: AuthPrincipal,
    projectId: string,
  ): Promise<ProjectDetail> {
    const context = await this.workspaces.resolve(principal);
    const row = await this.repository.findById(context.workspaceId, projectId);
    if (!row) {
      throw new NotFoundException("Project was not found");
    }
    return ProjectDetailSchema.parse({
      ...this.toSummary(row),
      script: row.script,
      storyboard: row.storyboard,
      versions: row.versions.map((version) => ({
        ...version,
        createdAt: version.createdAt.toISOString(),
      })),
      latestJob: row.latestJob
        ? {
            ...row.latestJob,
            createdAt: row.latestJob.createdAt.toISOString(),
            updatedAt: row.latestJob.updatedAt.toISOString(),
            completedAt: row.latestJob.completedAt?.toISOString() ?? null,
          }
        : null,
    });
  }

  private toSummary(row: ProjectSummaryRecord): ProjectSummary {
    const rank =
      levelRank[row.currentLevel as keyof typeof levelRank] ?? levelRank.idea;
    return {
      id: row.id,
      opportunityId: row.opportunityId,
      title: row.title,
      status: row.status as ProjectSummary["status"],
      currentLevel: row.currentLevel as ProjectSummary["currentLevel"],
      currentVersion: row.currentVersion,
      updatedAt: row.updatedAt.toISOString(),
      platform: row.platform as ProjectSummary["platform"],
      score: row.score,
      hasScript: rank >= levelRank.script,
      hasStoryboard: rank >= levelRank.storyboard,
      hasVideo: rank >= levelRank.video,
    };
  }
}
