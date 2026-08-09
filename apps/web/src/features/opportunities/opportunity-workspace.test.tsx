import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OpportunityDetail } from "@creonome/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpportunityWorkspace } from "./opportunity-workspace";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/src/lib/analytics/analytics", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/lib/analytics/analytics")
  >("@/src/lib/analytics/analytics");
  return { ...actual, track };
});

const opportunity: OpportunityDetail = {
  id: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
  strategy: "signature",
  title: "The silence before the drop",
  pitch: "Hold the room still, then let the first kick arrive alone.",
  score: 92,
  confidence: "high",
  freshness: "fresh",
  currentLevel: "idea",
  projectId: null,
  nextLevel: "script",
  creditCost: 2,
  hook: "Two euros. One take. No talking.",
  rationale: "This route matches the creator's restrained reveal language.",
  reserve: "Clear the sample before the storyboard step.",
  effort: "low",
  platform: "tiktok",
  estimatedDurationSeconds: 35,
  evidence: ["DNA fit 96/100", "Momentum 88/100"],
  trendSignal: {
    status: "ok",
    title: "Quiet process, loud reveal",
    lifecycle: "emerging",
    momentumScore: 88,
    observedAt: "2026-08-02T11:00:00.000Z",
    evidenceCount: 8,
    source: "trend_radar",
    reason: null,
  },
  subScores: {
    momentum: 88,
    dnaFit: 91,
    novelty: 62,
    feasibility: 40,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  track.mockReset();
});

describe("OpportunityWorkspace", () => {
  it("shows the real sub-score breakdown and text derived from those values", () => {
    render(<OpportunityWorkspace opportunity={opportunity} />);

    const items = screen.getAllByTestId("sub-score-item");
    expect(items).toHaveLength(4);
    expect(screen.getByText("Momentum")).toBeTruthy();
    expect(screen.getByText("Creator DNA fit")).toBeTruthy();
    expect(screen.getByText("Novelty")).toBeTruthy();
    expect(screen.getByText("Feasibility")).toBeTruthy();
    expect(screen.getByText("88/100")).toBeTruthy();
    expect(screen.getByText("91/100")).toBeTruthy();
    expect(screen.getByText("62/100")).toBeTruthy();
    expect(screen.getByText("40/100")).toBeTruthy();

    expect(
      screen.getAllByText(/creator dna fit is strong \(91\/100\)/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/feasibility is limited \(40\/100\)/i).length,
    ).toBeGreaterThan(0);
  });

  it("shows existing project maturity without offering a paid downgrade", () => {
    render(
      <OpportunityWorkspace
        opportunity={{
          ...opportunity,
          currentLevel: "storyboard",
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
        }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /move to script/i }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /continue in projects/i }),
    ).toBeTruthy();
    expect(screen.getByText("Current level")).toBeTruthy();
  });

  it("keeps the idea read-only and applies changes through the chat sheet", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        project: {
          id: "0198f3a2-82dd-7000-8000-000000000020",
          opportunityId: opportunity.id,
          title: opportunity.title,
          status: "active",
          currentLevel: "idea",
          currentVersion: 2,
          updatedAt: "2026-08-02T12:03:00.000Z",
        },
        version: 2,
        title: opportunity.title,
        pitch: opportunity.pitch,
        hook: "Let the room breathe. Then drop the needle.",
        changeSummary: "Quietened the opening while keeping one take.",
        memoryCandidate: {
          id: "0198f3a2-82dd-7000-8000-000000000021",
          status: "pending",
          scope: "project",
          content: "Prefer quiet openings for this project.",
        },
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /modify idea/i }));
    expect(
      screen.getByRole("dialog", { name: /modify this idea/i }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/describe the change/i), {
      target: { value: "Make the opening quieter but keep it one take." },
    });
    fireEvent.click(screen.getByLabelText(/remember for this project/i));
    fireEvent.click(screen.getByRole("button", { name: /apply change/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Let the room breathe. Then drop the needle."),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/memory suggestion awaits approval/i)).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/opportunities/${opportunity.id}/modify`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("records explicit creative feedback without leaving the opportunity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "0198f3a2-82dd-7000-8000-000000000024",
        opportunityId: opportunity.id,
        action: "this_is_me",
        memoryCandidate: null,
        createdAt: "2026-08-02T12:05:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<OpportunityWorkspace opportunity={opportunity} />);

    expect(screen.getByText("Does this feel like you?")).toBeTruthy();
    for (const label of [
      "That’s me",
      "Almost",
      "Not my style",
      "Good idea, wrong wording",
      "Never use",
      "Always do",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "That’s me" }));

    expect(await screen.findByText(/feedback saved/i)).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/opportunities/${opportunity.id}/feedback`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "this_is_me" }),
      }),
    );
    expect(
      screen
        .getByRole("button", { name: "That’s me" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("explains a stale modification without hiding it behind a generic error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { statusCode: 404, message: "Opportunity was not found" },
            { status: 404 },
          ),
        ),
    );
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /modify idea/i }));
    fireEvent.change(screen.getByLabelText(/describe the change/i), {
      target: { value: "Make the opening quieter." },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply change/i }));

    expect(
      await screen.findByText(/this opportunity is no longer available/i),
    ).toBeTruthy();
    expect(screen.queryByText(/original idea is intact/i)).toBeNull();
  });

  it("does not invite a duplicate revision after the API accepted the change", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ accepted: true }, { status: 201 })),
    );
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /modify idea/i }));
    fireEvent.change(screen.getByLabelText(/describe the change/i), {
      target: { value: "Make the opening quieter." },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply change/i }));

    expect(await screen.findByText(/change was saved.*reload/i)).toBeTruthy();
    expect(
      screen.queryByRole("dialog", { name: /modify this idea/i }),
    ).toBeNull();
    expect(screen.queryByText(/original idea is intact/i)).toBeNull();
  });

  it("shows the exact cost before generating and then renders the script", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          project: {
            id: "0198f3a2-82dd-7000-8000-000000000020",
            opportunityId: opportunity.id,
            title: opportunity.title,
            status: "active",
            currentLevel: "script",
            currentVersion: 2,
            updatedAt: "2026-08-02T12:04:00.000Z",
          },
          script: {
            id: "0198f3a2-82dd-7000-8000-000000000022",
            projectId: "0198f3a2-82dd-7000-8000-000000000020",
            title: opportunity.title,
            hook: "Let the room breathe. Then drop the needle.",
            body: "[0:00-0:08] Hold for two seconds. [0:08-0:15] Lower the needle. [0:15-0:35] Reveal the kick.",
            callToAction: "What comes after your silence?",
            caption: "The room is part of the arrangement.",
            platforms: ["tiktok", "instagram"],
            durationSeconds: 35,
          },
          job: {
            id: "0198f3a2-82dd-7000-8000-000000000023",
            kind: "script",
            provider: "gemini",
            model: "gemini-3.6-flash",
            status: "succeeded",
            progress: 100,
            createdAt: "2026-08-02T12:03:00.000Z",
            updatedAt: "2026-08-02T12:04:00.000Z",
            completedAt: "2026-08-02T12:04:00.000Z",
          },
          credits: { balance: 58, reserved: 0, available: 58 },
        }),
      ),
    );
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    expect(
      screen.getByRole("dialog", { name: /generate the script/i }).textContent,
    ).toContain("2 credits");
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /your script/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Script" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tab", { name: "Idea" })).toBeTruthy();
    expect(screen.getAllByTestId("script-segment")).toHaveLength(3);
    expect(screen.getByText(/hold for two seconds/i)).toBeTruthy();
    expect(track).toHaveBeenCalledWith("opportunity_upgraded_to_script", {
      opportunityId: opportunity.id,
      projectId: "0198f3a2-82dd-7000-8000-000000000020",
    });
    expect(screen.queryByLabelText("Opportunity detail")).toBeNull();
    expect(screen.getByText(/58 credits remaining/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /view project/i }).getAttribute("href"),
    ).toBe("/projects/0198f3a2-82dd-7000-8000-000000000020");
  });

  it("fires opportunity_upgraded_to_script once a queued script job finishes", async () => {
    const projectId = "0198f3a2-82dd-7000-8000-000000000020";
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === `/api/creonome/opportunities/${opportunity.id}/upgrade`) {
          return Response.json({
            job: {
              id: "0198f3a2-82dd-7000-8000-000000000023",
              kind: "script",
              provider: "gemini",
              model: "gemini-3.6-flash",
              status: "queued",
              progress: 0,
              createdAt: "2026-08-02T12:03:00.000Z",
              updatedAt: "2026-08-02T12:03:00.000Z",
              projectId,
            },
            credits: { balance: 56, reserved: 2, available: 54 },
          });
        }
        if (url === `/api/creonome/jobs/0198f3a2-82dd-7000-8000-000000000023`) {
          return Response.json({
            id: "0198f3a2-82dd-7000-8000-000000000023",
            kind: "script",
            provider: "gemini",
            model: "gemini-3.6-flash",
            status: "succeeded",
            progress: 100,
            createdAt: "2026-08-02T12:03:00.000Z",
            updatedAt: "2026-08-02T12:04:00.000Z",
            completedAt: "2026-08-02T12:04:00.000Z",
            projectId,
          });
        }
        if (url === `/api/creonome/projects/${projectId}`) {
          return Response.json({
            id: projectId,
            opportunityId: opportunity.id,
            title: opportunity.title,
            status: "active",
            currentLevel: "script",
            currentVersion: 2,
            updatedAt: "2026-08-02T12:04:00.000Z",
            platform: "tiktok",
            score: opportunity.score,
            hasScript: true,
            hasStoryboard: false,
            hasVideo: false,
            script: {
              id: "0198f3a2-82dd-7000-8000-000000000022",
              projectId,
              title: opportunity.title,
              hook: "Let the room breathe. Then drop the needle.",
              body: "[0:00-0:08] Hold for two seconds. [0:08-0:15] Lower the needle. [0:15-0:35] Reveal the kick.",
              callToAction: "What comes after your silence?",
              caption: "The room is part of the arrangement.",
              platforms: ["tiktok", "instagram"],
              durationSeconds: 35,
            },
            storyboard: null,
            video: null,
            versions: [],
            latestJob: null,
          });
        }
        if (url === "/api/creonome/credits") {
          return Response.json({ balance: 56, reserved: 0, available: 56 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    vi.stubGlobal("fetch", request);
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /your script/i }),
    ).toBeTruthy();
    expect(track).toHaveBeenCalledWith("opportunity_upgraded_to_script", {
      opportunityId: opportunity.id,
      projectId,
    });
  });

  it("moves confirmed script generation into a non-blocking progress toast", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
      ),
    );
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );

    expect(
      screen.queryByRole("dialog", { name: /generate the script/i }),
    ).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(
      /building your script.*2 credits held/i,
    );
    expect(screen.getByLabelText("Opportunity detail")).toBeTruthy();

    resolveRequest(new Response(null, { status: 503 }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("explains a stale opportunity without claiming credits were reserved", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { statusCode: 404, message: "Opportunity was not found" },
            { status: 404 },
          ),
        ),
    );
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );

    expect(
      await screen.findByText(/this opportunity is no longer available/i),
    ).toBeTruthy();
    expect(screen.queryByText(/reserved credits were released/i)).toBeNull();
  });

  it("uses a fresh idempotency key after released script credits", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { message: "generation failed", retryMode: "new_request" },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ message: "still unavailable" }, { status: 503 }),
      );
    vi.stubGlobal("fetch", request);
    render(<OpportunityWorkspace opportunity={opportunity} />);

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );
    expect(
      await screen.findByText(/reserved credits were released/i),
    ).toBeTruthy();
    const firstHeaders = request.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;

    fireEvent.click(screen.getByRole("button", { name: /move to script/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /generate script · 2 credits/i }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    const secondHeaders = request.mock.calls[1]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(secondHeaders["Idempotency-Key"]).not.toBe(
      firstHeaders["Idempotency-Key"],
    );
  });
});
