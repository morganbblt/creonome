import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpportunityRevisionSchema,
  QueuedGenerationJobSchema,
  UpgradeOpportunityResultSchema,
  type ModifyOpportunityInput,
  type OpportunityRevision,
  type QueuedGenerationJob,
  type UpgradeOpportunityInput,
  type UpgradeOpportunityResult,
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
  OPPORTUNITIES_REPOSITORY,
  type GeneratedOpportunityRevision,
  type GeneratedScript,
  type OpportunitiesRepository,
  type OpportunityRecord,
  type OpportunityRevisionRecord,
  type ScriptUpgradeRecord,
} from "./opportunities.repository.js";

const GeneratedRevisionSchema = z.object({
  title: z.string().trim().min(3).max(160),
  pitch: z.string().trim().min(12).max(320),
  hook: z.string().trim().min(3).max(220),
  changeSummary: z.string().trim().min(3).max(320),
  memoryContent: z.string().trim().min(3).max(500),
});

const generatedRevisionJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 160 },
    pitch: { type: "string", minLength: 12, maxLength: 320 },
    hook: { type: "string", minLength: 3, maxLength: 220 },
    changeSummary: { type: "string", minLength: 3, maxLength: 320 },
    memoryContent: { type: "string", minLength: 3, maxLength: 500 },
  },
  required: ["title", "pitch", "hook", "changeSummary", "memoryContent"],
  additionalProperties: false,
};

const GeneratedScriptSchema = z.object({
  title: z.string().trim().min(3).max(160),
  hook: z.string().trim().min(3).max(220),
  body: z.string().trim().min(12).max(4_000),
  callToAction: z.string().trim().min(3).max(220).nullable(),
  caption: z.string().trim().min(3).max(2_200).nullable(),
  platforms: z.array(z.enum(["tiktok", "instagram", "youtube"])).min(1),
  durationSeconds: z.number().int().positive().max(600).nullable(),
});

const generatedScriptJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 160 },
    hook: { type: "string", minLength: 3, maxLength: 220 },
    body: { type: "string", minLength: 12, maxLength: 4_000 },
    callToAction: {
      type: ["string", "null"],
      minLength: 3,
      maxLength: 220,
    },
    caption: {
      type: ["string", "null"],
      minLength: 3,
      maxLength: 2_200,
    },
    platforms: {
      type: "array",
      minItems: 1,
      items: { type: "string", enum: ["tiktok", "instagram", "youtube"] },
    },
    durationSeconds: { type: ["integer", "null"], minimum: 1, maximum: 600 },
  },
  required: [
    "title",
    "hook",
    "body",
    "callToAction",
    "caption",
    "platforms",
    "durationSeconds",
  ],
  additionalProperties: false,
};

@Injectable()
export class OpportunityWorkflowService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(OPPORTUNITIES_REPOSITORY)
    private readonly repository: OpportunitiesRepository,
    @Inject(CreditsService)
    private readonly credits: CreditsService,
    @Inject(STRUCTURED_GENERATOR)
    private readonly generator: StructuredGenerator,
    @Inject(QualityGateService)
    private readonly qualityGate: QualityGateService,
    @Inject(CreatorDnaService)
    private readonly creatorDna: CreatorDnaService,
    @Inject(GenerationJobEnqueueService)
    private readonly enqueue: GenerationJobEnqueueService,
    @Inject(JOBS_REPOSITORY)
    private readonly jobs: JobsRepository,
  ) {}

  async modify(
    principal: AuthPrincipal,
    opportunityId: string,
    input: ModifyOpportunityInput,
  ): Promise<OpportunityRevision> {
    const context = await this.workspaces.resolve(principal);
    const opportunity = await this.repository.findById(
      context.workspaceId,
      opportunityId,
    );
    if (!opportunity) {
      throw new NotFoundException("Opportunity was not found");
    }

    const generated = await this.generateRevision(opportunity, input, context);
    const revision = await this.repository.createRevision({
      ...context,
      opportunityId,
      memoryScope: input.memoryScope,
      lockedFields: input.lockedFields,
      generated,
    });
    if (!revision) {
      throw new NotFoundException("Opportunity was not found");
    }
    return this.toRevisionContract(revision);
  }

  /**
   * Triggered by `POST /opportunities/:id/upgrade`. Reserves credits (fast,
   * kept synchronous) then hands the actual script generation off to the
   * `creonome-generation` Cloud Tasks queue instead of running it inline.
   * Idempotent replays and already-upgraded opportunities still return the
   * finished result immediately.
   */
  async upgrade(
    principal: AuthPrincipal,
    opportunityId: string,
    _input: UpgradeOpportunityInput,
    idempotencyKey: string,
  ): Promise<UpgradeOpportunityResult | QueuedGenerationJob> {
    const normalizedKey = idempotencyKey.trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 180) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    const context = await this.workspaces.resolve(principal);
    const existing = await this.repository.findScriptUpgradeByIdempotency(
      context.workspaceId,
      normalizedKey,
    );
    if (existing) {
      const credits = await this.credits.commit(
        context.workspaceId,
        creditCosts.script,
        `${normalizedKey}:commit`,
        `Committed ${creditCosts.script} credits for script generation`,
      );
      return this.toUpgradeContract(existing, credits);
    }
    const existingProject = await this.repository.findExistingScriptUpgrade(
      context.workspaceId,
      opportunityId,
    );
    if (existingProject) {
      return this.toUpgradeContract(
        existingProject,
        await this.credits.getAccount(principal),
      );
    }

    const opportunity = await this.repository.findById(
      context.workspaceId,
      opportunityId,
    );
    if (!opportunity) {
      throw new NotFoundException("Opportunity was not found");
    }

    const cost = creditCosts.script;
    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${normalizedKey}:reserve`,
      `Reserve ${cost} credits for script generation`,
    );

    try {
      const job = await this.enqueue.createAndEnqueue({
        workspaceId: context.workspaceId,
        projectId: null,
        requestedByUserId: context.userId,
        kind: "script",
        provider: "pending",
        model: "pending",
        idempotencyKey: normalizedKey,
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          opportunityId,
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
          `Released ${cost} credits after a failed script generation queue attempt`,
        );
      } catch {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: "Script generation could not be queued",
        retryMode: "new_request",
      });
    }
  }

  /**
   * Invoked by the internal `/internal/opportunity-jobs/:jobId/execute`
   * handler (Cloud Tasks push target) for jobs of kind "script". Performs
   * the same generation work that used to run inline inside {@link upgrade},
   * then commits or releases the credits reserved by the public controller
   * action.
   */
  async executeQueuedScriptUpgrade(jobId: string): Promise<void> {
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
      opportunityId: string;
    };
    const workspaceId = context.workspaceId ?? job.workspaceId;
    const cost = creditCosts.script;

    let persisted = false;
    try {
      const opportunity = await this.repository.findById(
        workspaceId,
        context.opportunityId,
      );
      if (!opportunity) {
        throw new NotFoundException("Opportunity was not found");
      }
      const generated = await this.generateScript(opportunity, context);
      const gate = await this.qualityGate.evaluateScript(
        context.creatorProfileId,
        generated.script,
      );
      if (!gate.passed) {
        throw new QualityGateRejectedError(gate.violations);
      }
      const upgrade = await this.repository.createScriptUpgrade({
        workspaceId,
        creatorProfileId: context.creatorProfileId,
        userId: context.userId,
        opportunityId: context.opportunityId,
        idempotencyKey: job.idempotencyKey,
        provider: generated.provider,
        model: generated.model,
        generated: generated.script,
        jobId,
      });
      if (!upgrade) {
        throw new NotFoundException("Opportunity was not found");
      }
      // The job row itself was already flipped to "succeeded" as part of
      // the same write that persisted the script above.
      persisted = true;
      await this.credits.commit(
        workspaceId,
        cost,
        `${job.idempotencyKey}:commit`,
        `Committed ${cost} credits for script generation`,
      );
    } catch (error) {
      if (persisted) {
        // The script was already generated and saved (the job row already
        // reads "succeeded"); only the credit commit confirmation failed.
        // Don't overwrite a successful job with a failure status or
        // double-release credits that may already be committed.
        return;
      }
      const isQualityGateRejection = error instanceof QualityGateRejectedError;
      await this.jobs.markFailed(
        jobId,
        isQualityGateRejection ? "failed_final" : "failed_retryable",
        isQualityGateRejection ? "QUALITY_GATE_REJECTED" : "GENERATION_FAILED",
        error instanceof Error ? error.message : "Script generation failed",
      );
      await this.credits.release(
        workspaceId,
        cost,
        `${job.idempotencyKey}:release`,
        "Script generation failed",
      );
    }
  }

  private async generateRevision(
    opportunity: OpportunityRecord,
    input: ModifyOpportunityInput,
    context: { workspaceId: string; creatorProfileId: string },
  ): Promise<GeneratedOpportunityRevision> {
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    try {
      return await this.generator.generate({
        prompt: [
          "Revise this short-form vertical-video opportunity.",
          "Preserve any locked fields exactly and make only the requested change.",
          `Title: ${opportunity.title}`,
          `Pitch: ${opportunity.pitch}`,
          `Requested change: ${input.instruction}`,
          `Locked fields: ${input.lockedFields.join(", ") || "none"}`,
          `Memory scope: ${input.memoryScope}`,
          "Return concise production-ready copy and one explicit memory sentence.",
          buildHardConstraintsPromptLine(dna?.traits ?? []),
        ].join("\n"),
        schema: GeneratedRevisionSchema,
        jsonSchema: generatedRevisionJsonSchema,
      });
    } catch {
      return this.localRevision(opportunity, input);
    }
  }

  private localRevision(
    opportunity: OpportunityRecord,
    input: ModifyOpportunityInput,
  ): GeneratedOpportunityRevision {
    const instruction = input.instruction.trim();
    return {
      title: opportunity.title,
      pitch: opportunity.pitch,
      hook: input.lockedFields.includes("hook")
        ? `Open on one physical detail, then reveal: ${opportunity.title}.`
        : `${instruction.replace(/[.!?]+$/, "")}. Then reveal the track.`,
      changeSummary: `Applied the direction “${instruction}” while preserving locked fields.`,
      memoryContent: `For ${input.memoryScope} scope: ${instruction}`,
    };
  }

  private async generateScript(
    opportunity: OpportunityRecord,
    context: { workspaceId: string; creatorProfileId: string },
  ): Promise<{
    provider: string;
    model: string;
    script: GeneratedScript;
  }> {
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    try {
      const script = await this.generator.generate({
        prompt: [
          "Write a shootable script for a vertical music-creator video.",
          `Idea: ${opportunity.title}`,
          `Pitch: ${opportunity.pitch}`,
          `Duration: ${opportunity.estimatedDurationSeconds ?? 35} seconds`,
          "Keep it restrained, specific and feasible in one studio session.",
          "Do not cite individual third-party posts, handles or timecodes.",
          buildHardConstraintsPromptLine(dna?.traits ?? []),
        ].join("\n"),
        schema: GeneratedScriptSchema,
        jsonSchema: generatedScriptJsonSchema,
      });
      return { provider: "vertex-ai", model: "gemini-3.5-flash", script };
    } catch {
      return {
        provider: "creonome",
        model: "deterministic-script-v1",
        script: this.localScript(opportunity),
      };
    }
  }

  private localScript(opportunity: OpportunityRecord): GeneratedScript {
    return {
      title: opportunity.title,
      hook: `Start with the detail nobody notices: ${opportunity.title}.`,
      body: `${opportunity.pitch} Hold the first frame, show the decisive production gesture, then let the musical reveal land without extra explanation.`,
      callToAction: "What detail would you build from?",
      caption: `${opportunity.title} — one detail, one decision, one reveal.`,
      platforms: ["tiktok", "instagram"],
      durationSeconds: opportunity.estimatedDurationSeconds ?? 35,
    };
  }

  private toRevisionContract(
    revision: OpportunityRevisionRecord,
  ): OpportunityRevision {
    return OpportunityRevisionSchema.parse({
      ...revision,
      project: {
        ...revision.project,
        updatedAt: revision.project.updatedAt.toISOString(),
      },
    });
  }

  private toUpgradeContract(
    upgrade: ScriptUpgradeRecord,
    credits: { balance: number; reserved: number; available: number },
  ): UpgradeOpportunityResult {
    return UpgradeOpportunityResultSchema.parse({
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
}
