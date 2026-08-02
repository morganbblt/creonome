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
  ProjectSchema,
  type Opportunity,
  type OpportunityBatch,
  type OpportunityDetail,
  type OpportunityStrategy,
  type Project,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  OPPORTUNITIES_REPOSITORY,
  type OpportunitiesRepository,
} from "./opportunities.repository.js";

const strategyByPosition: Record<number, OpportunityStrategy> = {
  1: "signature",
  2: "stretch",
  3: "repeatable",
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
      opportunities: rows.map((row) => ({
        id: row.id,
        strategy: strategyByPosition[row.position],
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
      evidence: [
        row.scoreDnaFit >= 85
          ? "Strong DNA fit with the creator's established language."
          : "A deliberate stretch beyond the creator's usual language.",
        row.scoreMomentum >= 80
          ? "The underlying format is building current momentum."
          : "The format is stable enough for a measured experiment.",
        row.scoreFeasibility >= 85
          ? "Shootable with the creator's existing production habits."
          : "Plan one extra production pass before shooting.",
      ],
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

  private toOpportunity(
    row: import("./opportunities.repository.js").OpportunityRecord,
  ): Opportunity {
    return OpportunitySchema.parse({
      id: row.id,
      strategy: strategyByPosition[row.position],
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
