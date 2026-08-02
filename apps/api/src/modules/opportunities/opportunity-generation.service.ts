import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { OpportunityBatchSchema, type OpportunityBatch } from "@creonome/contracts";
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
          title: { type: "string" },
          pitch: { type: "string" },
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
      throw new BadRequestException("A valid Idempotency-Key header is required");
    }
    const context = await this.workspaces.resolve(principal);
    const existing = await this.repository.findByIdempotency(
      context.workspaceId,
      idempotencyKey,
    );
    if (existing.length === 3) {
      return this.toContract(existing);
    }

    await this.credits.reserve(
      context.workspaceId,
      3,
      `${idempotencyKey}:reserve`,
      "Generate three opportunities",
    );

    try {
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
      const records = await this.repository.createBatch({
        ...context,
        idempotencyKey,
        opportunities: generated.opportunities,
      });
      await this.credits.commit(
        context.workspaceId,
        3,
        `${idempotencyKey}:commit`,
        "Generated three opportunities",
      );
      return this.toContract(records);
    } catch (error) {
      await this.credits
        .release(
          context.workspaceId,
          3,
          `${idempotencyKey}:release`,
          "Opportunity generation failed",
        )
        .catch(() => undefined);
      throw error;
    }
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
