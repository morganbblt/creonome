import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type {
  ProjectDetail,
  ProjectList,
  QueuedGenerationJob,
  RegenerateScriptBlockResult,
  RegenerateStoryboardSceneResult,
  ReorderStoryboardScenesResult,
  UpgradeProjectResult,
  UpgradeVideoResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { FastifyReply } from "fastify";
import { CurrentUser } from "../auth/current-user.decorator.js";
import {
  RegenerateScriptBlockDto,
  RegenerateStoryboardSceneDto,
  ReorderStoryboardScenesDto,
} from "./edit-project.dto.js";
import { ProjectVideoService } from "./project-video.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectsService } from "./projects.service.js";
import { UpgradeProjectDto } from "./upgrade-project.dto.js";

@ApiTags("projects")
@ApiBearerAuth()
@Controller({ path: "projects", version: "1" })
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projects: ProjectsService,
    @Inject(ProjectWorkflowService)
    private readonly workflow: ProjectWorkflowService,
    @Inject(ProjectVideoService)
    private readonly videos: ProjectVideoService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current workspace projects" })
  @ApiOkResponse({ description: "Projects ordered by their latest change" })
  list(@CurrentUser() principal: AuthPrincipal): Promise<ProjectList> {
    return this.projects.list(principal);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one project and its latest deliverables" })
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
  ): Promise<ProjectDetail> {
    return this.projects.get(principal, projectId);
  }

  @Get(":id/video")
  @ApiOperation({ summary: "Stream the current private generated video" })
  async video(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Headers("range") range: string | undefined,
    @Query("download") download: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const video = await this.videos.read(principal, projectId, range);
    reply.status(video.contentRange ? 206 : 200);
    reply.header("Content-Type", "video/mp4");
    reply.header("Content-Length", String(video.contentLength));
    reply.header("Accept-Ranges", "bytes");
    reply.header("Cache-Control", "private, max-age=3600");
    reply.header(
      "Content-Disposition",
      `${download === "1" ? "attachment" : "inline"}; filename="creonome-video.mp4"`,
    );
    if (video.contentRange) {
      reply.header("Content-Range", video.contentRange);
    }
    return new StreamableFile(video.stream);
  }

  @Post(":id/upgrade")
  @ApiOperation({
    summary:
      "Confirm credits and queue a storyboard or video generation job; poll GET /jobs/:id for completion",
  })
  @ApiOkResponse({
    description:
      "Queued generation job (poll GET /jobs/:id), or the already-persisted storyboard/video for an idempotent replay",
  })
  upgrade(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() input: UpgradeProjectDto,
  ): Promise<UpgradeProjectResult | UpgradeVideoResult | QueuedGenerationJob> {
    return this.workflow.upgrade(
      principal,
      projectId,
      input,
      idempotencyKey ?? "",
    );
  }

  @Patch(":id/script")
  @ApiOperation({
    summary:
      "Regenerate a script block (hook/body/CTA/caption) from a targeted instruction",
  })
  @ApiOkResponse({ description: "The updated project and script" })
  regenerateScriptBlock(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Body() input: RegenerateScriptBlockDto,
  ): Promise<RegenerateScriptBlockResult> {
    return this.workflow.regenerateScriptBlock(principal, projectId, input);
  }

  // Registered before the ":sceneId" route below so the literal "reorder"
  // segment is never swallowed as a scene id (find-my-way disambiguates
  // static vs. parametric routes correctly regardless of declaration
  // order, but this keeps the intent obvious on read).
  @Patch(":id/storyboard/scenes/reorder")
  @ApiOperation({ summary: "Reorder the storyboard's scenes" })
  @ApiOkResponse({ description: "The updated project and storyboard" })
  reorderStoryboardScenes(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Body() input: ReorderStoryboardScenesDto,
  ): Promise<ReorderStoryboardScenesResult> {
    return this.workflow.reorderStoryboardScenes(principal, projectId, input);
  }

  @Patch(":id/storyboard/scenes/:sceneId")
  @ApiOperation({ summary: "Regenerate one storyboard scene in place" })
  @ApiOkResponse({ description: "The updated project and storyboard" })
  regenerateStoryboardScene(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Param("sceneId") sceneId: string,
    @Body() input: RegenerateStoryboardSceneDto,
  ): Promise<RegenerateStoryboardSceneResult> {
    return this.workflow.regenerateStoryboardScene(
      principal,
      projectId,
      sceneId,
      input,
    );
  }
}
