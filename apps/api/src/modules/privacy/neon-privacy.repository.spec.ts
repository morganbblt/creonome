import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { NeonPrivacyRepository } from "./neon-privacy.repository.js";

/**
 * Flattens a drizzle `SQL` condition into a readable string, e.g.
 * `(status = 'scheduled' and scheduled_for <= '2026-08-03T10:00:00.000Z')`.
 * This lets us assert on the *shape* of a WHERE clause without a live
 * Postgres connection.
 */
function renderCondition(condition: SQL): string {
  type Chunk = { name?: string; value?: unknown; queryChunks?: unknown[] };
  const render = (chunk: unknown): string => {
    if (chunk == null) return "";
    if (typeof chunk === "string") return chunk;
    if (Array.isArray(chunk)) return chunk.map(render).join(",");
    const typed = chunk as Chunk;
    if (typeof typed.name === "string") return typed.name;
    if ("value" in typed) return JSON.stringify(typed.value);
    if (Array.isArray(typed.queryChunks)) {
      return typed.queryChunks.map(render).join("");
    }
    return String(chunk);
  };
  return render(condition);
}

describe("NeonPrivacyRepository.findDueAccountDeletions", () => {
  it("filters to scheduled requests whose grace period has elapsed", async () => {
    const rows = [
      {
        id: "0198f3a2-82dd-7000-8000-000000000101",
        workspaceId: "0198f3a2-82dd-7000-8000-000000000102",
        scheduledFor: new Date("2026-08-01T10:00:00.000Z"),
      },
    ];
    let capturedWhere: SQL | undefined;
    const fakeDatabase = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((condition: SQL) => {
            capturedWhere = condition;
            return { orderBy: vi.fn().mockResolvedValue(rows) };
          }),
        }),
      }),
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);
    const now = new Date("2026-08-04T00:00:00.000Z");

    await expect(repository.findDueAccountDeletions(now)).resolves.toEqual(
      rows,
    );

    const rendered = renderCondition(capturedWhere!);
    // Excludes cancelled/completed requests: only status = 'scheduled'.
    expect(rendered).toContain("status");
    expect(rendered).toContain('"scheduled"');
    // Excludes requests whose grace period has not elapsed yet.
    expect(rendered).toContain("scheduled_for");
    expect(rendered).toContain("<=");
    expect(rendered).toContain(now.toISOString());
  });
});

describe("NeonPrivacyRepository workspace deletion helpers", () => {
  it("scopes source asset deletion to the owning workspace", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const fakeDatabase = {
      delete: vi.fn().mockReturnValue({ where }),
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);

    await repository.deleteWorkspaceSourceAsset("workspace-1", "asset-1");

    expect(fakeDatabase.delete).toHaveBeenCalledTimes(1);
    const rendered = renderCondition(where.mock.calls[0]![0] as SQL);
    expect(rendered).toContain('"workspace-1"');
    expect(rendered).toContain('"asset-1"');
  });

  it("deletes creator DNA versions only for profiles in the workspace", async () => {
    const profileRows = [{ id: "profile-1" }, { id: "profile-2" }];
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const fakeDatabase = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(profileRows),
        }),
      }),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);

    await repository.deleteWorkspaceCreatorDna("workspace-1");

    expect(fakeDatabase.delete).toHaveBeenCalledTimes(1);
    const rendered = renderCondition(deleteWhere.mock.calls[0]![0] as SQL);
    expect(rendered).toContain('"profile-1"');
    expect(rendered).toContain('"profile-2"');
  });

  it("skips the delete call when the workspace has no creator profile", async () => {
    const fakeDatabase = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
      delete: vi.fn(),
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);

    await repository.deleteWorkspaceCreatorDna("workspace-1");

    expect(fakeDatabase.delete).not.toHaveBeenCalled();
  });

  it("scopes project deletion to the owning workspace", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const fakeDatabase = {
      delete: vi.fn().mockReturnValue({ where }),
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);

    await repository.deleteWorkspaceProjects("workspace-1");

    expect(fakeDatabase.delete).toHaveBeenCalledTimes(1);
    const rendered = renderCondition(where.mock.calls[0]![0] as SQL);
    expect(rendered).toContain('"workspace-1"');
  });

  it("marks a request completed without touching credit ledger tables", async () => {
    const batch = vi.fn().mockResolvedValue([]);
    const updateWhere = vi.fn();
    const values = vi.fn();
    const fakeDatabase = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: updateWhere }),
      }),
      insert: vi.fn().mockReturnValue({ values }),
      batch,
    };
    const repository = new NeonPrivacyRepository(fakeDatabase as never);

    await repository.markAccountDeletionExecuted("request-1", "workspace-1");

    expect(fakeDatabase.update).toHaveBeenCalledTimes(1);
    expect(fakeDatabase.insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        action: "privacy.account_deletion_executed",
        entityId: "request-1",
      }),
    );
    expect(batch).toHaveBeenCalledTimes(1);
  });
});
