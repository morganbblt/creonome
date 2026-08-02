import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { CreatorDnaRepository } from "./creator-dna.repository.js";
import { CreatorDnaService } from "./creator-dna.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

describe("CreatorDnaService", () => {
  it("returns the latest DNA version with evidence-backed traits", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn().mockResolvedValue({
        id: "0198f3a2-82dd-7000-8000-000000000003",
        version: 2,
        summary: "Nocturnal electronic stories grounded in tactile details.",
        confirmed: true,
        traits: [
          {
            id: "0198f3a2-82dd-7000-8000-000000000004",
            category: "voice",
            label: "Tone",
            value: "precise and intimate",
            confidence: "0.950",
            evidence: { source: "onboarding" },
          },
        ],
      }),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.getCurrent(principal)).resolves.toEqual({
      version: 2,
      summary: "Nocturnal electronic stories grounded in tactile details.",
      confirmed: true,
      traits: [
        expect.objectContaining({ confidence: 0.95, label: "Tone" }),
      ],
    });
  });
});
