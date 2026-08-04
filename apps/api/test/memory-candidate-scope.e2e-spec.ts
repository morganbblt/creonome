import { randomUUID } from "node:crypto";
import { getTableName } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../src/modules/auth/auth-token-verifier.js";
import { MemoryCandidatesService } from "../src/modules/memory/memory-candidates.service.js";
import { NeonMemoryCandidateRepository } from "../src/modules/memory/neon-memory-candidate.repository.js";
import type { MemoryProvider } from "../src/modules/memory/memory-provider.js";
import { NeonOpportunitiesRepository } from "../src/modules/opportunities/neon-opportunities.repository.js";
import type { WorkspaceContextService } from "../src/modules/workspaces/workspace-context.service.js";

type FakeRow = Record<string, unknown>;

/**
 * Minimal in-memory stand-in for the Neon HTTP driver, following the same
 * pattern as opportunities.repository.spec.ts: `.values()` records the row
 * eagerly (mirroring how `database.batch([...])` is built and awaited in
 * the real repositories), and reads replay whatever has been written so
 * far. Just enough of the drizzle-orm query builder surface is implemented
 * to exercise the real `NeonOpportunitiesRepository.createRevision` (the
 * opportunity /modify persistence path) and the real
 * `NeonMemoryCandidateRepository.list` (the GET /memory-candidates read
 * path) without a live Postgres connection.
 */
function createFakeDatabase(seed: { opportunity: FakeRow }) {
  const memoryCandidateRows: FakeRow[] = [];

  const rowsForTable = (tableName: string): FakeRow[] => {
    if (tableName === "opportunities") return [seed.opportunity];
    if (tableName === "projects") return [];
    if (tableName === "memory_candidates") return memoryCandidateRows;
    return [];
  };

  const db = {
    select(_selection: unknown) {
      return {
        from(table: unknown) {
          const tableName = getTableName(table as never);
          return {
            where(_condition: unknown) {
              const rows = rowsForTable(tableName);
              return {
                limit: (n: number) => Promise.resolve(rows.slice(0, n)),
                orderBy: (_order: unknown) => ({
                  limit: (n: number) => Promise.resolve(rows.slice(0, n)),
                }),
              };
            },
          };
        },
      };
    },
    insert(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        values(value: FakeRow) {
          if (tableName === "memory_candidates") {
            // Mirrors the column defaults Postgres would apply for fields
            // the repository doesn't set explicitly.
            memoryCandidateRows.push({
              provider: "mem0",
              reviewedByUserId: null,
              reviewedAt: null,
              ...value,
            });
          }
          return { kind: "insert" };
        },
      };
    },
    update(_table: unknown) {
      return {
        set(_value: FakeRow) {
          return { where: (_condition: unknown) => ({ kind: "update" }) };
        },
      };
    },
    batch: vi.fn(async (queries: unknown[]) => queries),
  };

  return { db, memoryCandidateRows };
}

describe("memory candidate scope round trip", () => {
  it("persists an idea-scoped candidate from opportunity /modify and returns it from GET /memory-candidates with scope: idea", async () => {
    const workspaceId = randomUUID();
    const creatorProfileId = randomUUID();
    const userId = randomUUID();
    const opportunityId = randomUUID();

    const { db } = createFakeDatabase({
      opportunity: { id: opportunityId, title: "The silence before the drop" },
    });

    // 1. Write side: the same repository method OpportunityWorkflowService.modify()
    // calls to persist a /modify revision and its memory candidate.
    const opportunitiesRepository = new NeonOpportunitiesRepository(
      db as never,
    );
    const revision = await opportunitiesRepository.createRevision({
      workspaceId,
      creatorProfileId,
      userId,
      opportunityId,
      memoryScope: "idea",
      lockedFields: [],
      generated: {
        title: "The silence before the drop",
        pitch: "Hold the room still, then let the first kick arrive alone.",
        hook: "Let the room breathe.",
        changeSummary: "Quietened the opening.",
        memoryContent: "For idea scope: keep this one take quiet.",
      },
    });

    expect(revision).not.toBeNull();
    expect(revision?.memoryCandidate).toMatchObject({
      status: "pending",
      scope: "idea",
      content: "For idea scope: keep this one take quiet.",
    });

    // 2. Read side: the same repository + service GET /api/v1/memory-candidates uses.
    const memoryRepository = new NeonMemoryCandidateRepository(db as never);
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        userId,
        workspaceId,
        creatorProfileId,
      }),
    } as unknown as WorkspaceContextService;
    const provider: MemoryProvider = {
      search: vi.fn(),
      remember: vi.fn(),
      forget: vi.fn(),
    };
    const service = new MemoryCandidatesService(
      workspaces,
      memoryRepository,
      provider,
    );
    const principal: AuthPrincipal = { subject: userId };

    const response = await service.list(principal);

    expect(response.pendingCount).toBe(1);
    expect(response.pending).toHaveLength(1);
    expect(response.pending[0]).toMatchObject({
      status: "pending",
      scope: "idea",
      kind: "idea",
      content: "For idea scope: keep this one take quiet.",
    });
    expect(response.pending[0]?.confidence).toBeGreaterThan(0);
    expect(response.pending[0]?.confidence).toBeLessThanOrEqual(1);
  });
});
