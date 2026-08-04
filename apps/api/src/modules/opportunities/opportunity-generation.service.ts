import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpportunityBatchSchema,
  QueuedGenerationJobSchema,
  type OpportunityBatch,
  type QueuedGenerationJob,
} from "@creonome/contracts";
import { z } from "zod";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import { CreditsService } from "../credits/credits.service.js";
import { GenerationJobEnqueueService } from "../jobs/generation-job-enqueue.service.js";
import { toGenerationJobContract } from "../jobs/generation-job.mapper.js";
import {
  JOBS_REPOSITORY,
  type JobsRepository,
} from "../jobs/jobs.repository.js";
import {
  MEMORY_PROVIDER,
  type MemoryProvider,
} from "../memory/memory-provider.js";
import {
  STRUCTURED_GENERATOR,
  type StructuredGenerator,
} from "../ai/structured-generator.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  OPPORTUNITIES_REPOSITORY,
  type GeneratedOpportunity,
  type OpportunityRecord,
  type OpportunitiesRepository,
  type TrendSignalRecord,
} from "./opportunities.repository.js";
import type { OpportunityScoringDnaTrait } from "./opportunity-scoring.js";

const GeneratedSetSchema = z.object({
  opportunities: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        pitch: z.string().min(12).max(320),
        score: z.number().int().min(0).max(100),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .length(3),
});

const generatedSetJsonSchema = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          pitch: { type: "string", minLength: 12, maxLength: 320 },
          score: { type: "integer", minimum: 0, maximum: 100 },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title", "pitch", "score", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["opportunities"],
  additionalProperties: false,
};

const generationCost = 3;

type QueuedBatchContext = {
  workspaceId: string;
  userId: string;
  creatorProfileId: string;
  direction: string | null;
};

@Injectable()
export class OpportunityGenerationService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(OPPORTUNITIES_REPOSITORY)
    private readonly repository: OpportunitiesRepository,
    @Inject(CreditsService) private readonly credits: CreditsService,
    @Inject(CreatorDnaService) private readonly creatorDna: CreatorDnaService,
    @Inject(MEMORY_PROVIDER) private readonly memory: MemoryProvider,
    @Inject(STRUCTURED_GENERATOR)
    private readonly generator: StructuredGenerator,
    @Inject(GenerationJobEnqueueService)
    private readonly enqueue: GenerationJobEnqueueService,
    @Inject(JOBS_REPOSITORY)
    private readonly jobs: JobsRepository,
  ) {}

  /**
   * Triggered by `POST /opportunities/batches`. Reserves credits (fast,
   * kept synchronous) then hands the actual generation off to the
   * `creonome-generation` Cloud Tasks queue instead of running it inline,
   * so the request never risks the Cloud Run timeout. Replaying an
   * already-completed idempotency key still returns the finished batch
   * immediately, matching the previous synchronous behaviour.
   */
  async generate(
    principal: AuthPrincipal,
    idempotencyKey: string,
    direction?: string,
  ): Promise<OpportunityBatch | QueuedGenerationJob> {
    if (idempotencyKey.trim().length < 8) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    const context = await this.workspaces.resolve(principal);
    const existing = await this.repository.findByIdempotency(
      context.workspaceId,
      idempotencyKey,
    );
    if (existing.length === 3) {
      await this.credits.commit(
        context.workspaceId,
        generationCost,
        `${idempotencyKey}:commit`,
        "Generated three opportunities",
      );
      return this.toContract(existing);
    }

    await this.credits.reserve(
      context.workspaceId,
      generationCost,
      `${idempotencyKey}:reserve`,
      "Generate three opportunities",
    );

    try {
      const job = await this.enqueue.createAndEnqueue({
        workspaceId: context.workspaceId,
        projectId: null,
        requestedByUserId: context.userId,
        kind: "opportunity_batch",
        provider: "pending",
        model: "pending",
        idempotencyKey,
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          direction: direction ?? null,
        } satisfies QueuedBatchContext,
      });
      return QueuedGenerationJobSchema.parse({
        job: toGenerationJobContract(job),
        credits: await this.credits.getAccountForWorkspace(context.workspaceId),
      });
    } catch (error) {
      try {
        await this.credits.release(
          context.workspaceId,
          generationCost,
          `${idempotencyKey}:release`,
          "Opportunity generation could not be queued",
        );
      } catch {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: "Opportunity generation could not be queued",
        retryMode: "new_request",
      });
    }
  }

  /**
   * Invoked by the internal `/internal/opportunity-jobs/:jobId/execute`
   * handler (Cloud Tasks push target). Performs the same generation work
   * that used to run inline inside {@link generate}, then commits or
   * releases the credits reserved by the public controller action.
   */
  async executeQueuedBatch(jobId: string): Promise<void> {
    const job = await this.jobs.findByIdUnscoped(jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    if (job.status !== "queued") {
      // Already handled by a previous delivery of the same Cloud Tasks
      // task; treat as a no-op instead of redoing (and double-billing) it.
      return;
    }
    const running = await this.jobs.markRunning(jobId);
    if (!running) {
      return;
    }

    const context = job.input as unknown as QueuedBatchContext;
    const workspaceId = context.workspaceId ?? job.workspaceId;
    const direction = context.direction ?? undefined;

    let persisted = false;
    try {
      const [trendSignals, recentOpportunities] = await Promise.all([
        this.repository.listTrendSignals(workspaceId).catch(() => []),
        this.repository.listCurrent(workspaceId).catch(() => []),
      ]);
      // dnaTraits is only populated when the Creator DNA fetch inside
      // generateOpportunities actually succeeds; if it (or the LLM call)
      // fails, we fall back to canned opportunities and score them with no
      // known DNA/production-constraint data, per opportunity-scoring.ts's
      // documented fallback baselines.
      let dnaTraits: OpportunityScoringDnaTrait[] = [];
      const generated = await this.generateOpportunities(
        context,
        direction,
        trendSignals,
      )
        .then((result) => {
          dnaTraits = result.dnaTraits;
          return result.opportunities;
        })
        .catch(() => this.localOpportunities(direction));
      const records = await this.repository.createBatch({
        workspaceId,
        creatorProfileId: context.creatorProfileId,
        idempotencyKey: job.idempotencyKey,
        opportunities: generated,
        trendSignals,
        dnaTraits,
        recentOpportunities: recentOpportunities.map((record) => ({
          title: record.title,
          pitch: record.pitch,
        })),
      });
      await this.jobs.markSucceeded(jobId, {
        opportunityIds: records.map((record) => record.id),
      });
      persisted = true;
      await this.credits.commit(
        workspaceId,
        generationCost,
        `${job.idempotencyKey}:commit`,
        "Generated three opportunities",
      );
    } catch (error) {
      if (persisted) {
        // The batch was already generated and saved (the job row already
        // reads "succeeded"); only the credit commit confirmation failed.
        // Don't overwrite a successful job or double-release credits that
        // may already be committed.
        return;
      }
      await this.jobs.markFailed(
        jobId,
        "failed_retryable",
        "GENERATION_FAILED",
        error instanceof Error
          ? error.message
          : "Opportunity generation failed",
      );
      await this.credits.release(
        workspaceId,
        generationCost,
        `${job.idempotencyKey}:release`,
        "Opportunity generation failed",
      );
    }
  }

  private async generateOpportunities(
    context: { workspaceId: string; creatorProfileId: string },
    direction: string | undefined,
    trendSignals: TrendSignalRecord[],
  ): Promise<{
    opportunities: GeneratedOpportunity[];
    dnaTraits: OpportunityScoringDnaTrait[];
  }> {
    // A rejected Creator DNA fetch rejects this whole Promise.all, which
    // propagates up to the `.catch(() => this.localOpportunities(...))` in
    // executeQueuedBatch — a missing/unreadable Creator DNA still falls
    // back to the canned local opportunities, exactly as before this
    // method started also returning dnaTraits for scoring.
    const [dna, memories] = await Promise.all([
      this.creatorDna.getForWorkspaceContext(context),
      this.memory
        .search({
          query: direction ?? "current creative preferences and boundaries",
          workspaceId: context.workspaceId,
          creatorProfileId: context.creatorProfileId,
          topK: 6,
        })
        .catch(() => []),
    ]);
    const generated = await this.generator.generate({
      prompt: [
        "Generate exactly three distinct short-form music content opportunities.",
        "Use one natural fit, one stretch, and one repeatable format in that order.",
        `Creator DNA: ${dna.summary}`,
        `Approved memory: ${memories.map((item) => item.content).join(" | ") || "none"}`,
        `Normalized trend radar: ${
          trendSignals
            .map(
              (signal) =>
                `${signal.title} (${signal.lifecycle}, momentum ${signal.momentumScore}/100): ${signal.summary}`,
            )
            .join(" | ") ||
          "unavailable; rely on Creator DNA without inventing evidence"
        }`,
        `Direction: ${direction ?? "balanced"}`,
        "Do not copy trend wording and do not claim guaranteed virality.",
      ].join("\n"),
      schema: GeneratedSetSchema,
      jsonSchema: generatedSetJsonSchema,
    });
    return { opportunities: generated.opportunities, dnaTraits: dna.traits };
  }

  private localOpportunities(direction?: string): GeneratedOpportunity[] {
    const normalizedDirection = direction?.trim().slice(0, 80);
    const directionNote = normalizedDirection
      ? ` The requested direction is: ${normalizedDirection}.`
      : "";
    return [
      {
        title: "One gesture, one drop",
        pitch: `Film one decisive production gesture, then let the musical reveal land without explanation.${directionNote}`,
        score: 88,
        confidence: "high",
      },
      {
        title: "Build a track from one room sound",
        pitch: `Capture one texture in the room, transform it in three visible steps, and end on the finished loop.${directionNote}`,
        score: 82,
        confidence: "medium",
      },
      {
        title: "Four ingredients, one reveal",
        pitch: `Borrow a recipe-card structure: show four sounds, one arrangement choice, and the final vertical-video payoff.${directionNote}`,
        score: 76,
        confidence: "medium",
      },
    ];
  }

  private toContract(rows: OpportunityRecord[]): OpportunityBatch {
    const strategies = ["signature", "stretch", "repeatable"] as const;
    return OpportunityBatchSchema.parse({
      generatedAt: rows[0]!.availableAt.toISOString(),
      opportunities: rows.map((row, index) => ({
        id: row.id,
        strategy: strategies[index],
        title: row.title,
        pitch: row.pitch,
        score: row.scoreOverall,
        confidence: row.scoreConfidence,
        freshness: "new",
        nextLevel: "script",
        creditCost: 2,
      })),
    });
  }
}
