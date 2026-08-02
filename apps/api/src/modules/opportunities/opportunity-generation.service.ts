import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpportunityBatchSchema,
  type OpportunityBatch,
} from "@creonome/contracts";
import { z } from "zod";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import { CreditsService } from "../credits/credits.service.js";
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
} from "./opportunities.repository.js";

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
  ) {}

  async generate(
    principal: AuthPrincipal,
    idempotencyKey: string,
    direction?: string,
  ): Promise<OpportunityBatch> {
    if (idempotencyKey.trim().length < 8) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    const context = await this.workspaces.resolve(principal);
    const cost = 3;
    const existing = await this.repository.findByIdempotency(
      context.workspaceId,
      idempotencyKey,
    );
    if (existing.length === 3) {
      await this.credits.commit(
        context.workspaceId,
        cost,
        `${idempotencyKey}:commit`,
        "Generated three opportunities",
      );
      return this.toContract(existing);
    }

    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${idempotencyKey}:reserve`,
      "Generate three opportunities",
    );

    let persisted = false;
    try {
      const opportunities = await this.generateOpportunities(
        principal,
        context,
        direction,
      ).catch(() => this.localOpportunities(direction));
      const records = await this.repository.createBatch({
        ...context,
        idempotencyKey,
        opportunities,
      });
      persisted = true;
      await this.credits.commit(
        context.workspaceId,
        cost,
        `${idempotencyKey}:commit`,
        "Generated three opportunities",
      );
      return this.toContract(records);
    } catch (error) {
      if (persisted) {
        throw error;
      }
      try {
        await this.credits.release(
          context.workspaceId,
          cost,
          `${idempotencyKey}:release`,
          "Opportunity generation failed",
        );
      } catch {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: "Opportunity generation could not be completed",
        retryMode: "new_request",
      });
    }
  }

  private async generateOpportunities(
    principal: AuthPrincipal,
    context: { workspaceId: string; creatorProfileId: string },
    direction?: string,
  ): Promise<GeneratedOpportunity[]> {
    const [dna, memories] = await Promise.all([
      this.creatorDna.getCurrent(principal),
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
        `Direction: ${direction ?? "balanced"}`,
        "Do not copy trend wording and do not claim guaranteed virality.",
      ].join("\n"),
      schema: GeneratedSetSchema,
      jsonSchema: generatedSetJsonSchema,
    });
    return generated.opportunities;
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
