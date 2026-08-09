import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpportunitySchema,
  OpportunityDetailSchema,
  OpportunityBatchSchema,
  OpportunityFeedbackResultSchema,
  ProjectSchema,
  type Opportunity,
  type OpportunityBatch,
  type OpportunityDetail,
  type OpportunityFeedbackAction,
  type OpportunityFeedbackInput,
  type OpportunityFeedbackResult,
  type Project,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  OPPORTUNITIES_REPOSITORY,
  type OpportunitiesRepository,
} from "./opportunities.repository.js";

const ratingByFeedbackAction: Record<OpportunityFeedbackAction, number> = {
  this_is_me: 5,
  almost: 4,
  not_my_style: 1,
  good_idea_bad_wording: 3,
  never_use: 1,
  always_do: 5,
};

@Injectable()
export class OpportunitiesService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(OPPORTUNITIES_REPOSITORY)
    private readonly repository: OpportunitiesRepository,
  ) {}

  async getCurrent(principal: AuthPrincipal): Promise<OpportunityBatch> {
    const context = await this.workspaces.resolve(principal);
    const rows = await this.repository.listCurrent(context.workspaceId);

    if (rows.length !== 3) {
      throw new ServiceUnavailableException(
        "The current opportunity batch is not ready",
      );
    }

    return OpportunityBatchSchema.parse({
      generatedAt: rows[0]!.availableAt.toISOString(),
      fallback: rows[0]!.fallback,
      opportunities: rows.map((row) => ({
        id: row.id,
        strategy: row.strategy,
        title: row.title,
        pitch: row.pitch,
        score: row.scoreOverall,
        confidence: row.scoreConfidence,
        freshness: row.position === 2 ? "new" : "fresh",
        nextLevel: "script",
        creditCost: 2,
      })),
    });
  }

  async getById(
    principal: AuthPrincipal,
    opportunityId: string,
  ): Promise<OpportunityDetail> {
    const context = await this.workspaces.resolve(principal);
    const row = await this.repository.findById(
      context.workspaceId,
      opportunityId,
    );
    if (!row) {
      throw new NotFoundException("Opportunity was not found");
    }
    return OpportunityDetailSchema.parse({
      ...this.toOpportunity(row),
      currentLevel: row.projectCurrentLevel ?? "idea",
      projectId: row.projectId,
      hook:
        row.hook ?? `Open on one physical detail, then reveal: ${row.title}.`,
      rationale:
        row.rationale ??
        "This route balances current momentum with the creator's established language.",
      reserve:
        row.platform === "tiktok"
          ? "Confirm music and sample rights before the storyboard step."
          : null,
      effort: row.effort,
      platform: row.platform,
      estimatedDurationSeconds: row.estimatedDurationSeconds,
      trendSignal: row.trendSignal
        ? {
            status: row.trendSignal.sampleData ? "partial" : "ok",
            title: row.trendSignal.title,
            lifecycle: row.trendSignal.lifecycle,
            momentumScore: row.trendSignal.momentumScore,
            observedAt: row.trendSignal.observedAt.toISOString(),
            evidenceCount: row.trendSignal.evidenceCount,
            source: row.trendSignal.sampleData ? "sample" : "trend_radar",
            reason: row.trendSignal.sampleData
              ? "Synthetic or authorized sample signal used for the MVP demonstration."
              : null,
          }
        : undefined,
      evidence: [
        row.scoreDnaFit >= 85
          ? "Strong DNA fit with the creator's established language."
          : "A deliberate stretch beyond the creator's usual language.",
        row.trendSignal
          ? `${row.trendSignal.title} is ${row.trendSignal.lifecycle} at ${row.trendSignal.momentumScore}/100 momentum across ${row.trendSignal.evidenceCount} normalized references.`
          : row.scoreMomentum >= 80
            ? "The underlying format is building current momentum."
            : "The format is stable enough for a measured experiment.",
        row.scoreFeasibility >= 85
          ? "Shootable with the creator's existing production habits."
          : "Plan one extra production pass before shooting.",
      ],
      subScores: {
        momentum: row.scoreMomentum,
        dnaFit: row.scoreDnaFit,
        novelty: row.scoreNovelty,
        feasibility: row.scoreFeasibility,
      },
    });
  }

  async save(
    principal: AuthPrincipal,
    opportunityId: string,
  ): Promise<Project> {
    const context = await this.workspaces.resolve(principal);
    const project = await this.repository.saveAsProject({
      ...context,
      opportunityId,
    });
    if (!project) {
      throw new NotFoundException("Opportunity was not found");
    }
    return ProjectSchema.parse({
      ...project,
      updatedAt: project.updatedAt.toISOString(),
    });
  }

  async feedback(
    principal: AuthPrincipal,
    opportunityId: string,
    input: OpportunityFeedbackInput,
  ): Promise<OpportunityFeedbackResult> {
    const context = await this.workspaces.resolve(principal);
    const opportunity = await this.repository.findById(
      context.workspaceId,
      opportunityId,
    );
    if (!opportunity) {
      throw new NotFoundException("Opportunity was not found");
    }

    const memoryContent =
      input.action === "never_use"
        ? `Avoid creative directions similar to “${opportunity.title}”.`
        : input.action === "always_do"
          ? `Prefer creative directions similar to “${opportunity.title}”.`
          : null;
    const record = await this.repository.recordFeedback({
      ...context,
      opportunityId,
      projectId: opportunity.projectId,
      action: input.action,
      rating: ratingByFeedbackAction[input.action],
      comment: input.comment ?? null,
      memoryContent,
    });

    return OpportunityFeedbackResultSchema.parse({
      ...record,
      createdAt: record.createdAt.toISOString(),
    });
  }

  private toOpportunity(
    row: import("./opportunities.repository.js").OpportunityRecord,
  ): Opportunity {
    return OpportunitySchema.parse({
      id: row.id,
      strategy: row.strategy,
      title: row.title,
      pitch: row.pitch,
      score: row.scoreOverall,
      confidence: row.scoreConfidence,
      freshness: row.position === 2 ? "new" : "fresh",
      nextLevel: "script",
      creditCost: 2,
    });
  }
}
