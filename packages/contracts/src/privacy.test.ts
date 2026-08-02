import { describe, expect, it } from "vitest";
import {
  AccountDeletionCancellationSchema,
  AccountDeletionRequestInputSchema,
  PrivacyExportInputSchema,
  PrivacyExportSchema,
  PrivacyStateSchema,
  UpdatePrivacyPreferencesInputSchema,
} from "./privacy.js";

const scheduledDeletion = {
  id: "0198f3a2-82dd-7000-8000-000000000090",
  status: "scheduled" as const,
  requestedAt: "2026-08-02T10:00:00.000Z",
  scheduledFor: "2026-08-03T10:00:00.000Z",
};

describe("privacy contracts", () => {
  it("validates persisted privacy preferences and a scheduled deletion", () => {
    expect(
      PrivacyStateSchema.parse({
        preferences: {
          modelTrainingOptIn: false,
          keepRushesAfterExport: true,
          updatedAt: "2026-08-02T10:00:00.000Z",
        },
        accountDeletion: scheduledDeletion,
      }),
    ).toMatchObject({ accountDeletion: { status: "scheduled" } });
  });

  it("requires both explicit boolean preferences", () => {
    expect(
      UpdatePrivacyPreferencesInputSchema.safeParse({
        modelTrainingOptIn: true,
      }).success,
    ).toBe(false);
  });

  it("limits portable exports to implemented JSON datasets", () => {
    expect(
      PrivacyExportSchema.parse({
        kind: "projects",
        fileName: "creonome-projects-2026-08-02.json",
        mimeType: "application/json;charset=utf-8",
        content: '{"projects":[]}',
        createdAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toMatchObject({ kind: "projects" });
    expect(PrivacyExportInputSchema.safeParse({ kind: "media_zip" }).success).toBe(
      false,
    );
  });

  it("requires deliberate account-deletion confirmation and confirms cancellation", () => {
    expect(
      AccountDeletionRequestInputSchema.safeParse({
        confirmation: "DELETE MY ACCOUNT",
      }).success,
    ).toBe(true);
    expect(
      AccountDeletionRequestInputSchema.safeParse({ confirmation: "DELETE" })
        .success,
    ).toBe(false);
    expect(
      AccountDeletionCancellationSchema.parse({
        id: scheduledDeletion.id,
        cancelled: true,
      }),
    ).toEqual({ id: scheduledDeletion.id, cancelled: true });
  });
});
