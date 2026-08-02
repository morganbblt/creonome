import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryboardUpgrade } from "./storyboard-upgrade";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const projectId = "0198f3a2-82dd-7000-8000-000000000020";

const upgrade = {
  project: {
    id: projectId,
    opportunityId: "0198f3a2-82dd-7000-8000-000000000013",
    title: "The silence before the drop",
    status: "active",
    currentLevel: "storyboard",
    currentVersion: 3,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  storyboard: {
    id: "0198f3a2-82dd-7000-8000-000000000030",
    title: "The silence before the drop — storyboard",
    aspectRatio: "9:16",
    durationSeconds: 30,
    scenes: [
      {
        id: "0198f3a2-82dd-7000-8000-000000000031",
        position: 1,
        startSeconds: 0,
        heading: "Hold the room",
        description: "Locked close-up on the silent speaker cone.",
        shotType: "Extreme close-up",
        voiceover: "Hold the empty room.",
        onScreenText: "Before the drop",
        bRoll: "Dust moving through the studio light.",
        transition: "Hard cut on the needle touch.",
        requiredAsset: "Studio speaker close-up",
        sound: "Room tone only",
        editingNote: "Keep the first frame still for two seconds.",
        referenceFrameUrl: null,
        durationSeconds: 30,
      },
    ],
  },
  job: {
    id: "0198f3a2-82dd-7000-8000-000000000040",
    kind: "storyboard",
    provider: "gemini",
    model: "gemini-3.6-flash",
    status: "succeeded",
    progress: 100,
    errorCode: null,
    errorMessage: null,
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    completedAt: "2026-08-02T10:00:00.000Z",
  },
  credits: { balance: 54, reserved: 0, available: 54 },
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("StoryboardUpgrade", () => {
  it("confirms the credit reservation and refreshes the persisted storyboard", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(upgrade), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", request);
    const balanceChanged = vi.fn();
    window.addEventListener("creonome:credit-balance-changed", balanceChanged);

    render(<StoryboardUpgrade projectId={projectId} />);
    fireEvent.click(
      screen.getByRole("button", { name: /generate storyboard · 4 cr/i }),
    );

    expect(
      screen.getByText(
        "4 credits will be reserved. They are only charged if the storyboard is generated.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /confirm and generate/i }),
    );

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/projects/${projectId}/upgrade`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": expect.stringMatching(/^storyboard-/),
        }),
        body: JSON.stringify({
          targetLevel: "storyboard",
          confirmedCreditCost: true,
        }),
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(balanceChanged).toHaveBeenCalled();
    window.removeEventListener(
      "creonome:credit-balance-changed",
      balanceChanged,
    );
  });

  it("keeps the script actionable when generation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    render(<StoryboardUpgrade projectId={projectId} />);
    fireEvent.click(
      screen.getByRole("button", { name: /generate storyboard · 4 cr/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /confirm and generate/i }),
    );

    expect(
      await screen.findByText(
        "Storyboard generation is temporarily unavailable. Your script is intact and no credits were charged. Try again in a moment.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /confirm and generate/i }),
    ).toBeTruthy();
  });
});
