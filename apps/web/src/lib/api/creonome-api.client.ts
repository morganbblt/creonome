import {
  CreatorDnaSchema,
  CreditLedgerSchema,
  CreditsResponseSchema,
  IntegrationsResponseSchema,
  LibrarySchema,
  MemoryCandidatesResponseSchema,
  OnboardingStateSchema,
  ModifyOpportunityInputSchema,
  OpportunityBatchSchema,
  OpportunityDetailSchema,
  OpportunityRevisionSchema,
  ProjectDetailSchema,
  ProjectListSchema,
  UpgradeOpportunityInputSchema,
  UpgradeOpportunityResultSchema,
  type CreatorDna,
  type CreditLedger,
  type CreditsResponse,
  type IntegrationsResponse,
  type Library,
  type MemoryCandidatesResponse,
  type OnboardingState,
  type ModifyOpportunityInput,
  type OpportunityBatch,
  type OpportunityDetail,
  type OpportunityRevision,
  type ProjectDetail,
  type ProjectList,
  type UpgradeOpportunityInput,
  type UpgradeOpportunityResult,
} from "@creonome/contracts";
import type { z } from "zod";

type TokenProvider = () => Promise<string>;

export class CreonomeApiClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: TokenProvider,
    private readonly request: typeof fetch = globalThis.fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  getCurrentOpportunities(): Promise<OpportunityBatch> {
    return this.get("/opportunities", OpportunityBatchSchema);
  }

  getOnboarding(): Promise<OnboardingState> {
    return this.get("/onboarding", OnboardingStateSchema);
  }

  getOpportunity(opportunityId: string): Promise<OpportunityDetail> {
    return this.get(
      `/opportunities/${encodeURIComponent(opportunityId)}`,
      OpportunityDetailSchema,
    );
  }

  modifyOpportunity(
    opportunityId: string,
    input: ModifyOpportunityInput,
  ): Promise<OpportunityRevision> {
    return this.post(
      `/opportunities/${encodeURIComponent(opportunityId)}/modify`,
      ModifyOpportunityInputSchema.parse(input),
      OpportunityRevisionSchema,
    );
  }

  upgradeOpportunity(
    opportunityId: string,
    input: UpgradeOpportunityInput,
    idempotencyKey: string,
  ): Promise<UpgradeOpportunityResult> {
    return this.post(
      `/opportunities/${encodeURIComponent(opportunityId)}/upgrade`,
      UpgradeOpportunityInputSchema.parse(input),
      UpgradeOpportunityResultSchema,
      { "Idempotency-Key": idempotencyKey },
    );
  }

  getCreatorDna(): Promise<CreatorDna> {
    return this.get("/creator-dna", CreatorDnaSchema);
  }

  getMemoryCandidates(): Promise<MemoryCandidatesResponse> {
    return this.get("/memory-candidates", MemoryCandidatesResponseSchema);
  }

  getCredits(): Promise<CreditsResponse> {
    return this.get("/credits", CreditsResponseSchema);
  }

  getCreditLedger(): Promise<CreditLedger> {
    return this.get("/credits/ledger", CreditLedgerSchema);
  }

  getIntegrations(): Promise<IntegrationsResponse> {
    return this.get("/integrations", IntegrationsResponseSchema);
  }

  getProjects(): Promise<ProjectList> {
    return this.get("/projects", ProjectListSchema);
  }

  getLibrary(): Promise<Library> {
    return this.get("/assets", LibrarySchema);
  }

  getProject(projectId: string): Promise<ProjectDetail> {
    return this.get(
      `/projects/${encodeURIComponent(projectId)}`,
      ProjectDetailSchema,
    );
  }

  private async get<Output>(
    path: string,
    schema: z.ZodType<Output>,
  ): Promise<Output> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${await this.token()}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Creonome API request failed with status ${response.status}`,
      );
    }
    return schema.parse(await response.json());
  }

  private async post<Output>(
    path: string,
    body: unknown,
    schema: z.ZodType<Output>,
    headers: Record<string, string> = {},
  ): Promise<Output> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Creonome API request failed with status ${response.status}`,
      );
    }
    return schema.parse(await response.json());
  }
}
