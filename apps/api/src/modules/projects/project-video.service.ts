import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  PROJECTS_REPOSITORY,
  type ProjectsRepository,
} from "./projects.repository.js";
import {
  VIDEO_OBJECT_STORE,
  type VideoObjectRead,
  type VideoObjectStore,
} from "./video/video-object-store.js";

@Injectable()
export class ProjectVideoService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PROJECTS_REPOSITORY)
    private readonly repository: ProjectsRepository,
    @Inject(VIDEO_OBJECT_STORE)
    private readonly store: VideoObjectStore,
  ) {}

  async read(
    principal: AuthPrincipal,
    projectId: string,
    range?: string,
  ): Promise<VideoObjectRead> {
    const context = await this.workspaces.resolve(principal);
    const project = await this.repository.findById(
      context.workspaceId,
      projectId,
    );
    if (
      !project?.video ||
      project.video.simulated ||
      !project.video.gcsUri.startsWith("gs://")
    ) {
      throw new NotFoundException("A generated project video was not found");
    }
    return this.store.read(project.video.gcsUri, range);
  }
}
