import { describe, expect, it, vi } from "vitest";
import { NeonCreatorDnaRepository } from "./neon-creator-dna.repository.js";
import type {
  CreatorDnaRecord,
  CreatorDnaVersionDetailRecord,
} from "./creator-dna.repository.js";

describe("NeonCreatorDnaRepository.restoreVersion", () => {
  it("creates a new version copying the target version's traits and never touches the target", async () => {
    const current: CreatorDnaRecord = {
      id: "current-version-id",
      version: 5,
      summary: "Current summary",
      confirmed: true,
      traits: [
        {
          id: "current-trait-id",
          category: "voice",
          label: "Tone",
          value: "precise and intimate",
          confidence: "0.950",
          evidence: { source: "creator_edit" },
        },
      ],
    };
    const target: CreatorDnaVersionDetailRecord = {
      id: "target-version-id",
      version: 2,
      summary: "Older summary",
      confirmed: true,
      source: "creator_edit",
      restoredFromVersion: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      traits: [
        {
          id: "target-trait-id",
          category: "voice",
          label: "Tone",
          value: "warm and playful",
          confidence: "0.800",
          evidence: { source: "onboarding" },
        },
      ],
    };

    const insertCalls: Array<{ table: unknown; values: unknown }> = [];
    const database = {
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          insertCalls.push({ table, values });
          return { table, values };
        },
      })),
      batch: vi.fn(async () => []),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const repository = new NeonCreatorDnaRepository(database as never);
    vi.spyOn(repository, "getCurrent").mockResolvedValue(current);
    vi.spyOn(repository, "getVersion").mockResolvedValue(target);

    await repository.restoreVersion("profile-1", "user-1", 2);

    // The target version is never mutated or deleted.
    expect(database.update).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();

    expect(repository.getVersion).toHaveBeenCalledWith("profile-1", 2);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(insertCalls).toHaveLength(2);

    const versionInsert = insertCalls[0]!.values as Record<string, unknown>;
    expect(versionInsert).toMatchObject({
      creatorProfileId: "profile-1",
      version: 6, // current.version + 1, a brand-new version row
      summary: "Older summary", // copied from the target version
      source: "restore",
      confirmed: true,
      restoredFromVersion: 2,
      createdByUserId: "user-1",
    });

    const traitsInsert = insertCalls[1]!.values as Array<
      Record<string, unknown>
    >;
    expect(traitsInsert).toHaveLength(1);
    expect(traitsInsert[0]).toMatchObject({
      dnaVersionId: versionInsert.id,
      category: "voice",
      label: "Tone",
      value: "warm and playful", // copied from the target version's trait
      confidence: "0.800",
    });
    expect(traitsInsert[0]!.evidence).toMatchObject({
      source: "restore",
      restoredFromVersion: 2,
    });
    // A fresh row, not the target trait's own id.
    expect(traitsInsert[0]!.id).not.toBe("target-trait-id");
  });

  it("returns null without writing anything when the target version does not exist", async () => {
    const database = {
      insert: vi.fn(),
      batch: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    const repository = new NeonCreatorDnaRepository(database as never);
    vi.spyOn(repository, "getCurrent").mockResolvedValue({
      id: "current-version-id",
      version: 5,
      summary: "Current summary",
      confirmed: true,
      traits: [],
    });
    vi.spyOn(repository, "getVersion").mockResolvedValue(null);

    await expect(
      repository.restoreVersion("profile-1", "user-1", 999),
    ).resolves.toBeNull();
    expect(database.batch).not.toHaveBeenCalled();
  });
});
