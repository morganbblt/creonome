import type { OnboardingState } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingWorkspace } from "./onboarding-workspace";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const insight = {
  summary: "A restrained performance built around tactile close-ups.",
  disciplines: ["music performance", "video"],
  genres: ["electronic", "ambient"],
  creativeSignature: "Nocturnal, tactile and deliberately understated.",
  themes: ["process", "anticipation"],
  targetAudience: "Listeners drawn to intimate electronic performance.",
  boundaries: ["No fake urgency"],
  evidence: ["Long pause before the first beat"],
};
const profile = {
  stageName: "Nova Sainte",
  disciplines: ["music producer", "performer"],
  genres: ["electronic", "ambient"],
  creativeSignature:
    "Nocturnal electronic stories grounded in tactile details.",
  themes: ["ritual", "process"],
  targetAudience: "Curious electronic listeners and independent creators.",
  boundaries: ["No fake urgency"],
};

function onboardingState(
  step: OnboardingState["step"] = "upload",
): OnboardingState {
  const assets = Array.from({ length: 3 }, (_, index) => ({
    id: `0198f3a2-82dd-7000-8000-00000000006${index}`,
    fileName: `source-${index + 1}.mov`,
    mimeType: "video/quicktime",
    byteSize: 12_500_000,
    status: "ready" as const,
    representativeness: "representative" as const,
    analysis: insight,
    errorMessage: null,
    createdAt: "2026-08-02T10:00:00.000Z",
  }));
  return {
    status: "in_progress",
    step,
    readyCount: 3,
    recommendedAssetCount: 3,
    assets,
    profile: step === "profile" ? profile : null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("OnboardingWorkspace", () => {
  it("keeps social imports out of the MVP and offers private file import", () => {
    render(
      <OnboardingWorkspace
        initialState={{
          status: "pending",
          step: "source",
          readyCount: 0,
          recommendedAssetCount: 3,
          assets: [],
          profile: null,
        }}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: /TikTok.*Coming soon/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /Instagram.*Coming soon/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Choose files" })).toBeTruthy();
  });

  it("builds the editable profile from three analyzed sources", async () => {
    const drafted = { ...onboardingState("profile"), profile };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(drafted));
    vi.stubGlobal("fetch", request);
    render(<OnboardingWorkspace initialState={onboardingState()} />);

    fireEvent.click(screen.getByRole("button", { name: "Review my profile" }));

    expect(
      await screen.findByDisplayValue(profile.creativeSignature),
    ).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/onboarding/profile/draft",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retries an interrupted inline analysis without re-uploading the source", async () => {
    const interrupted = onboardingState();
    interrupted.readyCount = 2;
    interrupted.assets[0] = {
      ...interrupted.assets[0]!,
      status: "uploaded",
      analysis: null,
    };
    const recovered = onboardingState();
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(recovered));
    vi.stubGlobal("fetch", request);
    render(<OnboardingWorkspace initialState={interrupted} />);

    fireEvent.click(screen.getByRole("button", { name: "Try analysis again" }));

    expect(await screen.findByText("3 of 3 sources analyzed")).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/onboarding/assets/0198f3a2-82dd-7000-8000-000000000060/analyze",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("persists source labels without hiding analysis evidence", async () => {
    const relabeled = onboardingState();
    relabeled.assets[0] = {
      ...relabeled.assets[0]!,
      representativeness: "reference_only",
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(relabeled));
    vi.stubGlobal("fetch", request);
    render(<OnboardingWorkspace initialState={onboardingState()} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Reference only" })[0]!,
    );

    expect(await screen.findAllByText(insight.evidence[0]!)).toHaveLength(3);
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/onboarding/assets/0198f3a2-82dd-7000-8000-000000000060",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("removes a source and refreshes the onboarding evidence", async () => {
    const afterRemoval = onboardingState();
    afterRemoval.assets = afterRemoval.assets.slice(1);
    afterRemoval.readyCount = 2;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ id: afterRemoval.assets[0]?.id, deleted: true }),
      )
      .mockResolvedValueOnce(Response.json(afterRemoval));
    vi.stubGlobal("fetch", request);
    render(<OnboardingWorkspace initialState={onboardingState()} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove source" })[0]!,
    );

    expect(await screen.findByText("2 of 3 sources analyzed")).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/assets/0198f3a2-82dd-7000-8000-000000000060",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("saves creator corrections and enters the workspace", async () => {
    const completed = {
      ...onboardingState("profile"),
      status: "complete" as const,
      step: "complete" as const,
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(completed));
    vi.stubGlobal("fetch", request);
    render(<OnboardingWorkspace initialState={onboardingState("profile")} />);

    fireEvent.change(screen.getByLabelText("Creative signature"), {
      target: {
        value: "A corrected signature grounded in one-take performance.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm profile" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Profile saved",
    );
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/onboarding/profile",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("A corrected signature"),
      }),
    );
    expect(push).toHaveBeenCalledWith("/today");
  });
});
