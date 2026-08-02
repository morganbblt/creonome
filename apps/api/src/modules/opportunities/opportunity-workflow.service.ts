import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpportunityRevisionSchema,
  UpgradeOpportunityResultSchema,
  type ModifyOpportunityInput,
  type OpportunityRevision,
  type UpgradeOpportunityInput,
  type UpgradeOpportunityResult,
} from "@creonome/contracts";
import { z } from "zod";
import {
  STRUCTURED_GENERATOR,
  type StructuredGenerator,
} from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CreditsService, creditCosts } from "../credits/credits.service.js";
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

    const generated = await this.generateRevision(opportunity, input);
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

  async upgrade(
    principal: AuthPrincipal,
    opportunityId: string,
    _input: UpgradeOpportunityInput,
    idempotencyKey: string,
  ): Promise<UpgradeOpportunityResult> {
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

    let persisted = false;
    try {
      const generated = await this.generateScript(opportunity);
      const upgrade = await this.repository.createScriptUpgrade({
        ...context,
        opportunityId,
        idempotencyKey: normalizedKey,
        provider: generated.provider,
        model: generated.model,
        generated: generated.script,
      });
      if (!upgrade) {
        throw new NotFoundException("Opportunity was not found");
      }
      persisted = true;
      const credits = await this.credits.commit(
        context.workspaceId,
        cost,
        `${normalizedKey}:commit`,
        `Committed ${cost} credits for script generation`,
      );
      return this.toUpgradeContract(upgrade, credits);
    } catch (error) {
      if (!persisted) {
        try {
          await this.credits.release(
            context.workspaceId,
            cost,
            `${normalizedKey}:release`,
            `Released ${cost} credits after failed script generation`,
          );
        } catch {
          throw error;
        }
        throw new ServiceUnavailableException({
          message: "Script generation could not be completed",
          retryMode: "new_request",
        });
      }
      throw error;
    }
  }

  private async generateRevision(
    opportunity: OpportunityRecord,
    input: ModifyOpportunityInput,
  ): Promise<GeneratedOpportunityRevision> {
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

  private async generateScript(opportunity: OpportunityRecord): Promise<{
    provider: string;
    model: string;
    script: GeneratedScript;
  }> {
    try {
      const script = await this.generator.generate({
        prompt: [
          "Write a shootable script for a vertical music-creator video.",
          `Idea: ${opportunity.title}`,
          `Pitch: ${opportunity.pitch}`,
          `Duration: ${opportunity.estimatedDurationSeconds ?? 35} seconds`,
          "Keep it restrained, specific and feasible in one studio session.",
          "Do not cite individual third-party posts, handles or timecodes.",
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
