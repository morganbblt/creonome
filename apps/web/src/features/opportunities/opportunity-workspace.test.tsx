import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OpportunityDetail } from "@creonome/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpportunityWorkspace } from "./opportunity-workspace";

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
};

afterEach(() => vi.unstubAllGlobals());

describe("OpportunityWorkspace", () => {
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
            body: "Hold for two seconds, lower the needle, then reveal the kick.",
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
    expect(screen.getByText(/hold for two seconds/i)).toBeTruthy();
    expect(screen.getByText(/58 credits remaining/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /view project/i }).getAttribute("href"),
    ).toBe("/projects/0198f3a2-82dd-7000-8000-000000000020");
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
