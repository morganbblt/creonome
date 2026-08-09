import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  AttachStoryboardSceneAssetResultSchema,
  QueuedGenerationJobSchema,
  RegenerateScriptBlockResultSchema,
  RegenerateStoryboardSceneResultSchema,
  ReorderStoryboardScenesResultSchema,
  UpgradeProjectResultSchema,
  UpgradeVideoResultSchema,
  type AttachStoryboardSceneAssetInput,
  type AttachStoryboardSceneAssetResult,
  type QueuedGenerationJob,
  type RegenerateScriptBlockInput,
  type RegenerateScriptBlockResult,
  type RegenerateStoryboardSceneInput,
  type RegenerateStoryboardSceneResult,
  type ReorderStoryboardScenesInput,
  type ReorderStoryboardScenesResult,
  type UpgradeProjectInput,
  type UpgradeProjectResult,
  type UpgradeVideoResult,
} from "@creonome/contracts";
import { z } from "zod";
import {
  STRUCTURED_GENERATOR,
  type StructuredGenerator,
} from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import { buildHardConstraintsPromptLine } from "../creator-dna/forbidden-constraints.js";
import { CreditsService, creditCosts } from "../credits/credits.service.js";
import { GenerationJobEnqueueService } from "../jobs/generation-job-enqueue.service.js";
import { toGenerationJobContract } from "../jobs/generation-job.mapper.js";
import {
  JOBS_REPOSITORY,
  type JobsRepository,
} from "../jobs/jobs.repository.js";
import {
  QualityGateRejectedError,
  QualityGateService,
} from "../quality-gate/quality-gate.service.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  applyStoryboardLocks,
  buildScriptLockPromptLines,
  buildStoryboardLockPromptLines,
  findScriptLockViolations,
  findStoryboardLockViolations,
  findVideoLockViolations,
  LockViolationError,
  sceneFieldLockKey,
  STORYBOARD_SCENE_LOCKABLE_FIELDS,
  validateLockedFieldNames,
  validateScriptLockedFieldNames,
  type GeneratedScriptBlocks,
  type StoryboardSceneLockableField,
} from "./locked-fields.js";
import {
  PROJECTS_REPOSITORY,
  type GeneratedStoryboard,
  type GeneratedStoryboardScene,
  type ProjectSceneRecord,
  type ProjectScriptRecord,
  type ProjectStoryboardRecord,
  type ProjectVideoRecord,
  type ProjectsRepository,
  type StoryboardSourceRecord,
  type StoryboardUpgradeRecord,
  type VideoSourceRecord,
  type VideoUpgradeRecord,
} from "./projects.repository.js";
import { VIDEO_PROVIDER, type VideoProvider } from "./video/video-provider.js";

const GeneratedStoryboardSceneSchema = z.object({
  heading: z.string().trim().min(1).max(160),
  description: z.string().trim().min(3).max(2_000),
  shotType: z.string().trim().min(1).max(120).nullable(),
  voiceover: z.string().trim().min(1).max(2_000).nullable(),
  onScreenText: z.string().trim().min(1).max(500).nullable(),
  bRoll: z.string().trim().min(1).max(1_000).nullable(),
  transition: z.string().trim().min(1).max(500).nullable(),
  requiredAsset: z.string().trim().min(1).max(500).nullable(),
  sound: z.string().trim().min(1).max(1_000).nullable(),
  editingNote: z.string().trim().min(1).max(1_000).nullable(),
  referenceFrameUrl: z.url().nullable(),
  durationSeconds: z.number().int().positive().max(600),
});

const GeneratedStoryboardSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    aspectRatio: z.string().trim().min(3).max(24),
    durationSeconds: z.number().int().positive().max(3_600),
    scenes: z.array(GeneratedStoryboardSceneSchema).min(3).max(8),
  })
  .refine(
    (storyboard) =>
      storyboard.scenes.reduce(
        (total, scene) => total + scene.durationSeconds,
        0,
      ) === storyboard.durationSeconds,
    { message: "Scene durations must match the storyboard duration" },
  );

/**
 * The per-scene shape, factored out so both the whole-storyboard `/upgrade`
 * schema below and the single-scene `regenerateStoryboardScene` prompt
 * (bible §15.4) validate against the exact same JSON schema.
 */
const storyboardSceneJsonSchema = {
  type: "object",
  properties: {
    heading: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: "string", minLength: 3, maxLength: 2_000 },
    shotType: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 120,
    },
    voiceover: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 2_000,
    },
    onScreenText: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 500,
    },
    bRoll: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 1_000,
    },
    transition: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 500,
    },
    requiredAsset: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 500,
    },
    sound: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 1_000,
    },
    editingNote: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 1_000,
    },
    referenceFrameUrl: { type: ["string", "null"] },
    durationSeconds: { type: "integer", minimum: 1, maximum: 600 },
  },
  required: [
    "heading",
    "description",
    "shotType",
    "voiceover",
    "onScreenText",
    "bRoll",
    "transition",
    "requiredAsset",
    "sound",
    "editingNote",
    "referenceFrameUrl",
    "durationSeconds",
  ],
  additionalProperties: false,
};

const generatedStoryboardJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 160 },
    aspectRatio: { type: "string", minLength: 3, maxLength: 24 },
    durationSeconds: { type: "integer", minimum: 1, maximum: 3_600 },
    scenes: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: storyboardSceneJsonSchema,
    },
  },
  required: ["title", "aspectRatio", "durationSeconds", "scenes"],
  additionalProperties: false,
};

/**
 * The four regenerable script blocks (bible §15.3) — mirrors
 * `GeneratedScriptSchema` in opportunity-workflow.service.ts, minus
 * `title`/`platforms`/`durationSeconds`, which `regenerateScriptBlock`
 * never touches.
 */
const GeneratedScriptBlocksSchema = z.object({
  hook: z.string().trim().min(3).max(220),
  body: z.string().trim().min(12).max(4_000),
  callToAction: z.string().trim().min(3).max(220).nullable(),
  caption: z.string().trim().min(3).max(2_200).nullable(),
});

const generatedScriptBlocksJsonSchema = {
  type: "object",
  properties: {
    hook: { type: "string", minLength: 3, maxLength: 220 },
    body: { type: "string", minLength: 12, maxLength: 4_000 },
    callToAction: { type: ["string", "null"], minLength: 3, maxLength: 220 },
    caption: { type: ["string", "null"], minLength: 3, maxLength: 2_200 },
  },
  required: ["hook", "body", "callToAction", "caption"],
  additionalProperties: false,
};

@Injectable()
export class ProjectWorkflowService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PROJECTS_REPOSITORY)
    private readonly repository: ProjectsRepository,
    @Inject(CreditsService)
    private readonly credits: CreditsService,
    @Inject(STRUCTURED_GENERATOR)
    private readonly generator: StructuredGenerator,
    @Inject(VIDEO_PROVIDER)
    private readonly videoProvider: VideoProvider,
    @Inject(QualityGateService)
    private readonly qualityGate: QualityGateService,
    @Inject(CreatorDnaService)
    private readonly creatorDna: CreatorDnaService,
    @Inject(GenerationJobEnqueueService)
    private readonly enqueue: GenerationJobEnqueueService,
    @Inject(JOBS_REPOSITORY)
    private readonly jobs: JobsRepository,
  ) {}

  /**
   * Triggered by `POST /projects/:id/upgrade`. Reserves credits (fast, kept
   * synchronous) then hands the actual storyboard or video generation off
   * to the `creonome-generation` Cloud Tasks queue instead of running it
   * inline — video generation in particular used to run dangerously close
   * to the Cloud Run request timeout (VEO_TIMEOUT_MS is 240s against a
   * 300s limit). A genuine retry of the same request (identical
   * Idempotency-Key) still short-circuits to the already-finished result
   * without regenerating or spending credits twice. A *new* request
   * (fresh Idempotency-Key) against a project that already has a
   * storyboard or video regenerates that level instead of returning the
   * old artifact — see {@link executeQueuedStoryboardUpgrade} and
   * {@link executeQueuedVideoUpgrade}, which also enforce any
   * `lockedFields` the caller asked to preserve (bible §9.6).
   */
  async upgrade(
    principal: AuthPrincipal,
    projectId: string,
    input: UpgradeProjectInput,
    idempotencyKey: string,
  ): Promise<UpgradeProjectResult | UpgradeVideoResult | QueuedGenerationJob> {
    const normalizedKey = idempotencyKey.trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 180) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    const lockedFields = input.lockedFields ?? [];
    validateLockedFieldNames(input.targetLevel, lockedFields);

    const context = await this.workspaces.resolve(principal);
    if (input.targetLevel === "video") {
      return this.upgradeVideo(context, projectId, normalizedKey, lockedFields);
    }
    const idempotent = await this.repository.findStoryboardUpgradeByIdempotency(
      context.workspaceId,
      normalizedKey,
    );
    if (idempotent) {
      const credits = await this.credits.commit(
        context.workspaceId,
        creditCosts.storyboard,
        `${normalizedKey}:commit`,
        `Committed ${creditCosts.storyboard} credits for storyboard generation`,
      );
      return this.toContract(idempotent, credits);
    }

    // Deliberately no short-circuit on an already-produced storyboard: a
    // fresh request (new idempotency key) regenerates it, creating a new
    // project_versions row rather than silently replaying the old one.
    const source = await this.repository.findStoryboardSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A script-ready project was not found");
    }

    const cost = creditCosts.storyboard;
    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${normalizedKey}:reserve`,
      `Reserve ${cost} credits for storyboard generation`,
    );

    try {
      const job = await this.enqueue.createAndEnqueue({
        workspaceId: context.workspaceId,
        projectId,
        requestedByUserId: context.userId,
        kind: "storyboard",
        provider: "pending",
        model: "pending",
        idempotencyKey: normalizedKey,
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields,
        },
      });
      return QueuedGenerationJobSchema.parse({
        job: toGenerationJobContract(job),
        credits: await this.credits.getAccountForWorkspace(context.workspaceId),
      });
    } catch (error) {
      try {
        await this.credits.release(
          context.workspaceId,
          cost,
          `${normalizedKey}:release`,
          `Released ${cost} credits after a failed storyboard generation queue attempt`,
        );
      } catch {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: "Storyboard generation could not be queued",
        retryMode: "new_request",
      });
    }
  }

  /**
   * Invoked by the internal `/internal/project-jobs/:jobId/execute` handler
   * (Cloud Tasks push target) for jobs of kind "storyboard". Performs the
   * same generation work that used to run inline inside {@link upgrade},
   * then commits or releases the credits reserved by the public controller
   * action.
   */
  async executeQueuedStoryboardUpgrade(jobId: string): Promise<void> {
    const job = await this.jobs.findByIdUnscoped(jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    if (job.status !== "queued") {
      return;
    }
    const running = await this.jobs.markRunning(jobId);
    if (!running) {
      return;
    }

    const context = job.input as {
      workspaceId: string;
      creatorProfileId: string;
      userId: string;
      projectId: string;
      lockedFields?: string[];
    };
    const workspaceId = context.workspaceId ?? job.workspaceId;
    const projectId = context.projectId ?? job.projectId!;
    const lockedFields = context.lockedFields ?? [];
    const cost = creditCosts.storyboard;

    let persisted = false;
    try {
      const source = await this.repository.findStoryboardSource(
        workspaceId,
        projectId,
      );
      if (!source) {
        throw new NotFoundException("A script-ready project was not found");
      }
      // Only present when this call is regenerating an already-produced
      // storyboard; used purely to diff against locked fields, never to
      // short-circuit the regeneration.
      const previous = await this.repository.findExistingStoryboardUpgrade(
        workspaceId,
        projectId,
      );
      const previousStoryboard = previous?.storyboard ?? null;

      let generated = await this.generateStoryboard(source, context, {
        lockedFields,
        previous: previousStoryboard,
      });
      let lockViolations = findStoryboardLockViolations(
        previousStoryboard,
        generated.storyboard,
        lockedFields,
      );
      if (lockViolations.length > 0) {
        // One retry with a stricter, more explicit prompt before giving up.
        generated = await this.generateStoryboard(source, context, {
          lockedFields,
          previous: previousStoryboard,
          strict: true,
        });
        lockViolations = findStoryboardLockViolations(
          previousStoryboard,
          generated.storyboard,
          lockedFields,
        );
        if (lockViolations.length > 0) {
          throw new LockViolationError(lockViolations);
        }
      }

      const gate = await this.qualityGate.evaluateStoryboard(
        context.creatorProfileId,
        generated.storyboard,
      );
      if (!gate.passed) {
        throw new QualityGateRejectedError(gate.violations);
      }
      const upgrade = await this.repository.createStoryboardUpgrade({
        workspaceId,
        creatorProfileId: context.creatorProfileId,
        userId: context.userId,
        projectId,
        idempotencyKey: job.idempotencyKey,
        provider: generated.provider,
        model: generated.model,
        generated: generated.storyboard,
        lockedFields,
        jobId,
      });
      if (!upgrade) {
        throw new NotFoundException("A script-ready project was not found");
      }
      // The job row itself was already flipped to "succeeded" as part of
      // the same write that persisted the storyboard above.
      persisted = true;
      await this.credits.commit(
        workspaceId,
        cost,
        `${job.idempotencyKey}:commit`,
        `Committed ${cost} credits for storyboard generation`,
      );
    } catch (error) {
      if (persisted) {
        // The storyboard was already generated and saved (the job row
        // already reads "succeeded"); only the credit commit confirmation
        // failed. Don't overwrite a successful job or double-release
        // credits that may already be committed.
        return;
      }
      const isQualityGateRejection = error instanceof QualityGateRejectedError;
      const isLockViolation = error instanceof LockViolationError;
      await this.jobs.markFailed(
        jobId,
        isQualityGateRejection || isLockViolation
          ? "failed_final"
          : "failed_retryable",
        isLockViolation
          ? "LOCKED_FIELD_VIOLATION"
          : isQualityGateRejection
            ? "QUALITY_GATE_REJECTED"
            : "GENERATION_FAILED",
        error instanceof Error ? error.message : "Storyboard generation failed",
      );
      await this.credits.release(
        workspaceId,
        cost,
        `${job.idempotencyKey}:release`,
        "Storyboard generation failed",
      );
    }
  }

  private async upgradeVideo(
    context: {
      workspaceId: string;
      userId: string;
      creatorProfileId: string;
    },
    projectId: string,
    idempotencyKey: string,
    lockedFields: string[],
  ): Promise<UpgradeVideoResult | QueuedGenerationJob> {
    const idempotent = await this.repository.findVideoUpgradeByIdempotency(
      context.workspaceId,
      idempotencyKey,
    );
    if (idempotent) {
      const credits = await this.credits.commit(
        context.workspaceId,
        creditCosts.video,
        `${idempotencyKey}:commit`,
        `Committed ${creditCosts.video} credits for video generation`,
      );
      return this.toVideoContract(idempotent, credits);
    }

    // Deliberately no short-circuit on an already-produced video: a fresh
    // request (new idempotency key) regenerates it instead of silently
    // replaying the old one.
    const source = await this.repository.findVideoSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A storyboard-ready project was not found");
    }

    const cost = creditCosts.video;
    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${idempotencyKey}:reserve`,
      `Reserve ${cost} credits for video generation`,
    );

    try {
      const job = await this.enqueue.createAndEnqueue({
        workspaceId: context.workspaceId,
        projectId,
        requestedByUserId: context.userId,
        kind: "video_render",
        provider: "pending",
        model: "pending",
        idempotencyKey,
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields,
        },
      });
      return QueuedGenerationJobSchema.parse({
        job: toGenerationJobContract(job),
        credits: await this.credits.getAccountForWorkspace(context.workspaceId),
      });
    } catch (error) {
      try {
        await this.credits.release(
          context.workspaceId,
          cost,
          `${idempotencyKey}:release`,
          `Released ${cost} credits after a failed video generation queue attempt`,
        );
      } catch {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: "Video generation could not be queued",
        retryMode: "new_request",
      });
    }
  }

  /**
   * Invoked by the internal `/internal/project-jobs/:jobId/execute` handler
   * (Cloud Tasks push target) for jobs of kind "video_render". Performs the
   * same generation work that used to run inline inside {@link upgradeVideo}
   * — including the Veo call that used to sit dangerously close to the
   * Cloud Run request timeout — then commits or releases the credits
   * reserved by the public controller action.
   */
  async executeQueuedVideoUpgrade(jobId: string): Promise<void> {
    const job = await this.jobs.findByIdUnscoped(jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    if (job.status !== "queued") {
      return;
    }
    const running = await this.jobs.markRunning(jobId);
    if (!running) {
      return;
    }

    const context = job.input as {
      workspaceId: string;
      creatorProfileId: string;
      userId: string;
      projectId: string;
      lockedFields?: string[];
    };
    const workspaceId = context.workspaceId ?? job.workspaceId;
    const projectId = context.projectId ?? job.projectId!;
    const lockedFields = context.lockedFields ?? [];
    const cost = creditCosts.video;

    let persisted = false;
    try {
      const source = await this.repository.findVideoSource(
        workspaceId,
        projectId,
      );
      if (!source) {
        throw new NotFoundException("A storyboard-ready project was not found");
      }
      // Only present when this call is regenerating an already-produced
      // video; used purely to diff against locked fields, never to
      // short-circuit the regeneration.
      const previous = await this.repository.findExistingVideoUpgrade(
        workspaceId,
        projectId,
      );
      const previousVideo: ProjectVideoRecord | null = previous?.video ?? null;

      let artifact = await this.videoProvider.generate({
        workspaceId,
        projectId,
        idempotencyKey: job.idempotencyKey,
        source,
      });
      let lockViolations = findVideoLockViolations(
        previousVideo,
        artifact,
        lockedFields,
      );
      if (lockViolations.length > 0) {
        // The video provider takes no textual instructions to "try
        // harder" with, unlike the storyboard's LLM prompt — a plain
        // retry is the best available second attempt.
        artifact = await this.videoProvider.generate({
          workspaceId,
          projectId,
          idempotencyKey: job.idempotencyKey,
          source,
        });
        lockViolations = findVideoLockViolations(
          previousVideo,
          artifact,
          lockedFields,
        );
        if (lockViolations.length > 0) {
          throw new LockViolationError(lockViolations);
        }
      }
      const gate = await this.qualityGate.evaluateVideo(
        context.creatorProfileId,
        {
          width: artifact.width,
          height: artifact.height,
          sourceText: this.videoSourceText(source),
        },
      );
      if (!gate.passed) {
        throw new QualityGateRejectedError(gate.violations);
      }
      const upgrade = await this.repository.createVideoUpgrade({
        workspaceId,
        userId: context.userId,
        projectId,
        idempotencyKey: job.idempotencyKey,
        artifact,
        lockedFields,
        jobId,
      });
      if (!upgrade) {
        throw new NotFoundException("A storyboard-ready project was not found");
      }
      // The job row itself was already flipped to "succeeded" as part of
      // the same write that persisted the video above.
      persisted = true;
      await this.credits.commit(
        workspaceId,
        cost,
        `${job.idempotencyKey}:commit`,
        `Committed ${cost} credits for ${artifact.simulated ? "fallback" : "Veo"} video generation`,
      );
    } catch (error) {
      if (persisted) {
        // The video was already generated and saved (the job row already
        // reads "succeeded"); only the credit commit confirmation failed.
        // Don't overwrite a successful job or double-release credits that
        // may already be committed.
        return;
      }
      const isQualityGateRejection = error instanceof QualityGateRejectedError;
      const isLockViolation = error instanceof LockViolationError;
      await this.jobs.markFailed(
        jobId,
        isQualityGateRejection || isLockViolation
          ? "failed_final"
          : "failed_retryable",
        isLockViolation
          ? "LOCKED_FIELD_VIOLATION"
          : isQualityGateRejection
            ? "QUALITY_GATE_REJECTED"
            : "GENERATION_FAILED",
        error instanceof Error ? error.message : "Video generation failed",
      );
      await this.credits.release(
        workspaceId,
        cost,
        `${job.idempotencyKey}:release`,
        "Video generation failed",
      );
    }
  }

  /**
   * `PATCH /projects/:id/script` (bible §15.3): regenerates every script
   * block (hook/body/callToAction/caption) from a targeted instruction,
   * preserving any block in `input.lockedFields` exactly. Unlike
   * storyboard/video `/upgrade`, this runs synchronously with no credit
   * cost — a single script edit is small and fast, the same judgment call
   * already made for `POST /opportunities/:id/modify`. `title`,
   * `platforms` and `durationSeconds` are never touched by this route.
   */
  async regenerateScriptBlock(
    principal: AuthPrincipal,
    projectId: string,
    input: RegenerateScriptBlockInput,
  ): Promise<RegenerateScriptBlockResult> {
    const lockedFields = input.lockedFields ?? [];
    validateScriptLockedFieldNames(input.field, lockedFields);

    const context = await this.workspaces.resolve(principal);
    const source = await this.repository.findStoryboardSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A script-ready project was not found");
    }

    let blocks = await this.generateScriptBlocks(source, input, context, {
      strict: false,
    });
    let violations = findScriptLockViolations(
      source.script,
      blocks,
      lockedFields,
    );
    if (violations.length > 0) {
      // One retry with a stricter, more explicit prompt before giving up —
      // mirrors the storyboard/video regeneration retry above.
      blocks = await this.generateScriptBlocks(source, input, context, {
        strict: true,
      });
      violations = findScriptLockViolations(
        source.script,
        blocks,
        lockedFields,
      );
      if (violations.length > 0) {
        throw new UnprocessableEntityException({
          message: `Locked field(s) were changed by generation: ${violations
            .map((violation) => violation.field)
            .join(", ")}`,
          violations,
        });
      }
    }

    const gate = await this.qualityGate.evaluateScript(
      context.creatorProfileId,
      blocks,
    );
    if (!gate.passed) {
      throw new UnprocessableEntityException({
        message: "The regenerated script did not pass the quality gate",
        violations: gate.violations,
      });
    }

    const updated = await this.repository.updateScriptBlocks({
      workspaceId: context.workspaceId,
      projectId,
      userId: context.userId,
      scriptId: source.script.id,
      generated: blocks,
      lockedFields,
    });
    if (!updated) {
      throw new NotFoundException("A script-ready project was not found");
    }

    return RegenerateScriptBlockResultSchema.parse({
      project: {
        ...updated.project,
        updatedAt: updated.project.updatedAt.toISOString(),
      },
      script: updated.script,
    });
  }

  private async generateScriptBlocks(
    source: StoryboardSourceRecord,
    input: RegenerateScriptBlockInput,
    context: { workspaceId: string; creatorProfileId: string },
    options: { strict: boolean },
  ): Promise<GeneratedScriptBlocks> {
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    try {
      return await this.generator.generate({
        prompt: [
          "Revise this shootable script for a vertical-video creator.",
          `Title: ${source.script.title}`,
          `Hook: ${source.script.hook}`,
          `Body: ${source.script.body}`,
          `Call to action: ${source.script.callToAction ?? "none"}`,
          `Caption: ${source.script.caption ?? "none"}`,
          `Focus the requested change on the "${input.field}" block; only touch other blocks if it is needed for coherence.`,
          `Requested change: ${input.instruction}`,
          ...buildScriptLockPromptLines(
            input.lockedFields,
            source.script,
            options.strict,
          ),
          buildHardConstraintsPromptLine(dna?.traits ?? []),
        ].join("\n"),
        schema: GeneratedScriptBlocksSchema,
        jsonSchema: generatedScriptBlocksJsonSchema,
      });
    } catch {
      // Deterministic fallback: no prompt channel to "try harder" with, so
      // only touch the targeted block (leaving every other block — locked
      // or not — byte-identical to the previous script, which trivially
      // satisfies any lock).
      return this.localScriptBlocks(source.script, input);
    }
  }

  private localScriptBlocks(
    script: ProjectScriptRecord,
    input: RegenerateScriptBlockInput,
  ): GeneratedScriptBlocks {
    const blocks: GeneratedScriptBlocks = {
      hook: script.hook,
      body: script.body,
      callToAction: script.callToAction,
      caption: script.caption,
    };
    const edited = `${blocks[input.field] ?? ""} — ${input.instruction.trim()}`
      .trim()
      .slice(0, 4_000);
    // Explicit per-field assignment — see the matching comment in
    // locked-fields.ts#applyScriptLocks for why a generic `blocks[field] =`
    // doesn't type-check here.
    if (input.field === "hook") blocks.hook = edited;
    else if (input.field === "body") blocks.body = edited;
    else if (input.field === "callToAction") blocks.callToAction = edited;
    else if (input.field === "caption") blocks.caption = edited;
    return blocks;
  }

  /**
   * `PATCH /projects/:id/storyboard/scenes/:sceneId` (bible §15.4):
   * regenerates exactly one scene, reusing {@link generateStoryboard}'s
   * generation/lock/quality-gate machinery scoped to a single scene rather
   * than duplicating it. Synchronous and free, for the same reason as
   * {@link regenerateScriptBlock} above.
   */
  async regenerateStoryboardScene(
    principal: AuthPrincipal,
    projectId: string,
    sceneId: string,
    input: RegenerateStoryboardSceneInput,
  ): Promise<RegenerateStoryboardSceneResult> {
    const fieldLocks = input.lockedFields ?? [];
    for (const field of fieldLocks) {
      if (
        !(STORYBOARD_SCENE_LOCKABLE_FIELDS as readonly string[]).includes(field)
      ) {
        throw new BadRequestException(
          `"${field}" is not a lockable storyboard scene field. Use one of ${STORYBOARD_SCENE_LOCKABLE_FIELDS.join(", ")}.`,
        );
      }
    }

    const context = await this.workspaces.resolve(principal);
    const current = await this.repository.findExistingStoryboardUpgrade(
      context.workspaceId,
      projectId,
    );
    if (!current) {
      throw new NotFoundException("A storyboard-ready project was not found");
    }
    const targetScene = current.storyboard.scenes.find(
      (scene) => scene.id === sceneId,
    );
    if (!targetScene) {
      throw new NotFoundException(
        "This scene was not found on the current storyboard",
      );
    }
    const source = await this.repository.findStoryboardSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A script-ready project was not found");
    }

    // Re-addressed as "scene:<position>:<field>" so the existing
    // whole-storyboard diff/prompt helpers in locked-fields.ts can be
    // reused verbatim instead of duplicated for the single-scene case.
    const prefixedLockedFields = fieldLocks.map((field) =>
      sceneFieldLockKey(
        targetScene.position,
        field as StoryboardSceneLockableField,
      ),
    );

    let generatedScene = await this.generateSingleScene(
      source,
      current.storyboard,
      targetScene,
      input,
      context,
      { lockedFields: prefixedLockedFields, strict: false },
    );
    let candidate = this.spliceGeneratedScene(
      current.storyboard,
      targetScene.position,
      generatedScene,
    );
    let violations = findStoryboardLockViolations(
      current.storyboard,
      candidate,
      prefixedLockedFields,
    );
    if (violations.length > 0) {
      generatedScene = await this.generateSingleScene(
        source,
        current.storyboard,
        targetScene,
        input,
        context,
        { lockedFields: prefixedLockedFields, strict: true },
      );
      candidate = this.spliceGeneratedScene(
        current.storyboard,
        targetScene.position,
        generatedScene,
      );
      violations = findStoryboardLockViolations(
        current.storyboard,
        candidate,
        prefixedLockedFields,
      );
      if (violations.length > 0) {
        throw new UnprocessableEntityException({
          message: `Locked field(s) were changed by generation: ${violations
            .map((violation) => violation.field)
            .join(", ")}`,
          violations,
        });
      }
    }

    const gate = await this.qualityGate.evaluateStoryboard(
      context.creatorProfileId,
      candidate,
    );
    if (!gate.passed) {
      throw new UnprocessableEntityException({
        message: "The regenerated scene did not pass the quality gate",
        violations: gate.violations,
      });
    }

    const updated = await this.repository.updateStoryboardScene({
      workspaceId: context.workspaceId,
      projectId,
      userId: context.userId,
      storyboardId: current.storyboard.id,
      sceneId,
      generated: generatedScene,
      lockedFields: prefixedLockedFields,
    });
    if (!updated) {
      throw new NotFoundException(
        "This scene was not found on the current storyboard",
      );
    }

    return RegenerateStoryboardSceneResultSchema.parse({
      project: {
        ...updated.project,
        updatedAt: updated.project.updatedAt.toISOString(),
      },
      storyboard: updated.storyboard,
    });
  }

  private async generateSingleScene(
    source: StoryboardSourceRecord,
    storyboard: ProjectStoryboardRecord,
    targetScene: ProjectSceneRecord,
    input: RegenerateStoryboardSceneInput,
    context: { workspaceId: string; creatorProfileId: string },
    lockOptions: { lockedFields: string[]; strict: boolean },
  ): Promise<GeneratedStoryboardScene> {
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    const otherScenes = storyboard.scenes
      .filter((scene) => scene.id !== targetScene.id)
      .map(
        (scene) =>
          `Scene ${scene.position} (${scene.heading}): ${scene.description}`,
      )
      .join("\n");
    try {
      return await this.generator.generate({
        prompt: [
          "Regenerate exactly one scene of this vertical-video storyboard, keeping it consistent with the rest of the sequence and the underlying script.",
          `Script hook: ${source.script.hook}`,
          `Script body: ${source.script.body}`,
          `Scene to regenerate: ${targetScene.position} — currently "${targetScene.heading}".`,
          otherScenes ? `Other scenes for context:\n${otherScenes}` : "",
          `Requested change: ${input.instruction ?? "Improve this scene while keeping it consistent with the rest of the sequence."}`,
          ...buildStoryboardLockPromptLines(
            lockOptions.lockedFields,
            storyboard,
            lockOptions.strict,
          ),
          buildHardConstraintsPromptLine(dna?.traits ?? []),
        ]
          .filter(Boolean)
          .join("\n"),
        schema: GeneratedStoryboardSceneSchema,
        jsonSchema: storyboardSceneJsonSchema,
      });
    } catch {
      // Deterministic fallback: no prompt channel to "try harder" with, so
      // keep the scene unchanged rather than block the edit with a hard
      // failure — trivially satisfies any lock on this scene.
      return {
        heading: targetScene.heading,
        description: targetScene.description,
        shotType: targetScene.shotType,
        voiceover: targetScene.voiceover,
        onScreenText: targetScene.onScreenText,
        bRoll: targetScene.bRoll,
        transition: targetScene.transition,
        requiredAsset: targetScene.requiredAsset,
        sound: targetScene.sound,
        editingNote: targetScene.editingNote,
        referenceFrameUrl: targetScene.referenceFrameUrl,
        durationSeconds: targetScene.durationSeconds ?? 1,
      };
    }
  }

  private spliceGeneratedScene(
    storyboard: ProjectStoryboardRecord,
    position: number,
    scene: GeneratedStoryboardScene,
  ): GeneratedStoryboard {
    const scenes = storyboard.scenes.map((existing) =>
      existing.position === position
        ? scene
        : ({
            heading: existing.heading,
            description: existing.description,
            shotType: existing.shotType,
            voiceover: existing.voiceover,
            onScreenText: existing.onScreenText,
            bRoll: existing.bRoll,
            transition: existing.transition,
            requiredAsset: existing.requiredAsset,
            sound: existing.sound,
            editingNote: existing.editingNote,
            referenceFrameUrl: existing.referenceFrameUrl,
            durationSeconds: existing.durationSeconds ?? 0,
          } satisfies GeneratedStoryboardScene),
    );
    return {
      title: storyboard.title,
      aspectRatio: storyboard.aspectRatio,
      durationSeconds: scenes.reduce(
        (total, scene) => total + scene.durationSeconds,
        0,
      ),
      scenes,
    };
  }

  /**
   * `PATCH /projects/:id/storyboard/scenes/reorder`: renumbers the
   * storyboard's scenes to match `input.sceneIds`. Purely mechanical (no
   * generation, no locks) so it never calls the generator or quality gate.
   */
  async reorderStoryboardScenes(
    principal: AuthPrincipal,
    projectId: string,
    input: ReorderStoryboardScenesInput,
  ): Promise<ReorderStoryboardScenesResult> {
    const context = await this.workspaces.resolve(principal);
    const current = await this.repository.findExistingStoryboardUpgrade(
      context.workspaceId,
      projectId,
    );
    if (!current) {
      throw new NotFoundException("A storyboard-ready project was not found");
    }

    const updated = await this.repository.reorderStoryboardScenes({
      workspaceId: context.workspaceId,
      projectId,
      userId: context.userId,
      storyboardId: current.storyboard.id,
      orderedSceneIds: input.sceneIds,
    });
    if (!updated) {
      throw new BadRequestException(
        "The requested scene order does not match this storyboard's current scenes",
      );
    }

    return ReorderStoryboardScenesResultSchema.parse({
      project: {
        ...updated.project,
        updatedAt: updated.project.updatedAt.toISOString(),
      },
      storyboard: updated.storyboard,
    });
  }

  /**
   * `PATCH /projects/:id/storyboard/scenes/:sceneId/asset` (P2.4): attaches
   * or detaches one Library asset on a single scene. Purely mechanical (no
   * generation, no locks), like {@link reorderStoryboardScenes} above --
   * unlike {@link regenerateStoryboardScene}, this never calls the
   * generator, so the scene's AI-generated fields (and every other scene)
   * are left exactly as they were.
   */
  async attachStoryboardSceneAsset(
    principal: AuthPrincipal,
    projectId: string,
    sceneId: string,
    input: AttachStoryboardSceneAssetInput,
  ): Promise<AttachStoryboardSceneAssetResult> {
    const context = await this.workspaces.resolve(principal);
    const current = await this.repository.findExistingStoryboardUpgrade(
      context.workspaceId,
      projectId,
    );
    if (!current) {
      throw new NotFoundException("A storyboard-ready project was not found");
    }
    const targetScene = current.storyboard.scenes.find(
      (scene) => scene.id === sceneId,
    );
    if (!targetScene) {
      throw new NotFoundException(
        "This scene was not found on the current storyboard",
      );
    }

    const outcome = await this.repository.attachStoryboardSceneAsset({
      workspaceId: context.workspaceId,
      projectId,
      userId: context.userId,
      storyboardId: current.storyboard.id,
      sceneId,
      assetId: input.assetId,
    });
    if (outcome.outcome === "asset_not_found") {
      throw new BadRequestException(
        "This asset was not found in the current workspace",
      );
    }
    if (outcome.outcome === "scene_not_found") {
      throw new NotFoundException(
        "This scene was not found on the current storyboard",
      );
    }

    return AttachStoryboardSceneAssetResultSchema.parse({
      project: {
        ...outcome.record.project,
        updatedAt: outcome.record.project.updatedAt.toISOString(),
      },
      storyboard: outcome.record.storyboard,
    });
  }

  private videoSourceText(source: VideoSourceRecord): string {
    return [
      source.script.hook,
      source.script.body,
      source.script.callToAction,
      source.script.caption,
      ...source.storyboard.scenes.flatMap((scene) => [
        scene.heading,
        scene.description,
        scene.voiceover,
        scene.onScreenText,
      ]),
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n");
  }

  private async generateStoryboard(
    source: StoryboardSourceRecord,
    context: { workspaceId: string; creatorProfileId: string },
    lockOptions: {
      lockedFields: string[];
      previous: ProjectStoryboardRecord | null;
      strict?: boolean;
    } = { lockedFields: [], previous: null },
  ): Promise<{
    provider: string;
    model: string;
    storyboard: GeneratedStoryboard;
  }> {
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    try {
      const storyboard = await this.generator.generate({
        prompt: [
          "Turn this script into a shootable vertical-video storyboard.",
          `Title: ${source.script.title}`,
          `Hook: ${source.script.hook}`,
          `Body: ${source.script.body}`,
          `Call to action: ${source.script.callToAction ?? "none"}`,
          `Target duration: ${source.script.durationSeconds ?? 30} seconds`,
          "Create 3 to 8 chronological scenes in 9:16.",
          "Every scene needs a precise frame, action, audio, transition, required asset and edit instruction.",
          "Keep it feasible for an independent music creator in one studio session.",
          "Scene durations must add up to the storyboard duration.",
          ...buildStoryboardLockPromptLines(
            lockOptions.lockedFields,
            lockOptions.previous,
            lockOptions.strict,
          ),
          buildHardConstraintsPromptLine(dna?.traits ?? []),
        ].join("\n"),
        schema: GeneratedStoryboardSchema,
        jsonSchema: generatedStoryboardJsonSchema,
      });
      return {
        provider: "vertex-ai",
        model: "gemini-3.5-flash",
        storyboard,
      };
    } catch {
      // The deterministic fallback is a fixed template with no prompt
      // channel to "try harder" on locked fields with, so force them to
      // match the previous version instead of returning content that
      // would only fail the lock check again on a channel that can never
      // improve.
      return {
        provider: "creonome",
        model: "deterministic-storyboard-v1",
        storyboard: applyStoryboardLocks(
          this.localStoryboard(source),
          lockOptions.lockedFields,
          lockOptions.previous,
        ),
      };
    }
  }

  private localStoryboard(source: StoryboardSourceRecord): GeneratedStoryboard {
    const total = Math.max(source.script.durationSeconds ?? 30, 12);
    const opening = Math.max(3, Math.floor(total * 0.27));
    const process = Math.max(3, Math.floor(total * 0.33));
    const reveal = total - opening - process;

    return {
      title: `${source.script.title} — storyboard`.slice(0, 160),
      aspectRatio: "9:16",
      durationSeconds: total,
      scenes: [
        {
          heading: "Opening detail",
          description:
            "Hold on one tactile studio detail before revealing its purpose.",
          shotType: "Locked extreme close-up",
          voiceover: source.script.hook,
          onScreenText: "Start with the detail nobody notices",
          bRoll: "Room light, cables and a silent speaker cone.",
          transition: "Hard cut on the first physical gesture.",
          requiredAsset: "One clean macro take of the opening detail",
          sound: "Room tone with no music",
          editingNote: "Hold the first frame long enough to create tension.",
          referenceFrameUrl: null,
          durationSeconds: opening,
        },
        {
          heading: "Production gesture",
          description:
            "Show the single decisive action that changes the musical idea.",
          shotType: "Macro tracking shot",
          voiceover: source.script.body.slice(0, 2_000),
          onScreenText: null,
          bRoll: "DAW playhead, hands and meters responding to the action.",
          transition: "Cut on action into the musical reveal.",
          requiredAsset: "Close take of the creator performing the gesture",
          sound: "Contact sound leading into the track",
          editingNote: "Let the real transient motivate the cut.",
          referenceFrameUrl: null,
          durationSeconds: process,
        },
        {
          heading: "Musical reveal",
          description:
            "Open to the full studio and let the finished musical moment land.",
          shotType: "Wide handheld reveal",
          voiceover: source.script.callToAction,
          onScreenText: source.script.caption?.slice(0, 500) ?? null,
          bRoll: "Meters, performance details and the creator's reaction.",
          transition: "Resolve on a frame that can loop to the opening.",
          requiredAsset: "Wide performance take with clean master audio",
          sound: "Finished track master",
          editingNote:
            "Prioritize the musical payoff; remove extra explanation.",
          referenceFrameUrl: null,
          durationSeconds: reveal,
        },
      ],
    };
  }

  private toContract(
    upgrade: StoryboardUpgradeRecord,
    credits: { balance: number; reserved: number; available: number },
  ): UpgradeProjectResult {
    return UpgradeProjectResultSchema.parse({
      ...upgrade,
      project: {
        ...upgrade.project,
        updatedAt: upgrade.project.updatedAt.toISOString(),
      },
      job: {
        ...upgrade.job,
        createdAt: upgrade.job.createdAt.toISOString(),
        updatedAt: upgrade.job.updatedAt.toISOString(),
        completedAt: upgrade.job.completedAt?.toISOString() ?? null,
      },
      credits,
    });
  }

  private toVideoContract(
    upgrade: VideoUpgradeRecord,
    credits: { balance: number; reserved: number; available: number },
  ): UpgradeVideoResult {
    return UpgradeVideoResultSchema.parse({
      ...upgrade,
      project: {
        ...upgrade.project,
        updatedAt: upgrade.project.updatedAt.toISOString(),
      },
      video: {
        ...upgrade.video,
        createdAt: upgrade.video.createdAt.toISOString(),
      },
      job: {
        ...upgrade.job,
        createdAt: upgrade.job.createdAt.toISOString(),
        updatedAt: upgrade.job.updatedAt.toISOString(),
        completedAt: upgrade.job.completedAt?.toISOString() ?? null,
      },
      credits,
    });
  }
}
