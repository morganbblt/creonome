import type { ScriptDraft } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScriptEditor } from "./script-editor";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const projectId = "0198f3a2-82dd-7000-8000-000000000020";

const script: ScriptDraft = {
  id: "0198f3a2-82dd-7000-8000-000000000022",
  projectId,
  title: "Warehouse tape loop",
  hook: "Let the room breathe. Then drop the needle.",
  body: "[0:00-0:08] Hold for two seconds. [0:08-0:15] Lower the needle. [0:15-0:35] Reveal the kick.",
  callToAction: "What comes after your silence?",
  caption: "The room is part of the arrangement.",
  platforms: ["tiktok", "instagram"],
  durationSeconds: 35,
};

const updatedScript = {
  ...script,
  hook: "Hold the empty room, then break it.",
};

const patchResult = {
  project: {
    id: projectId,
    opportunityId: null,
    title: script.title,
    status: "active",
    currentLevel: "script",
    currentVersion: 3,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  script: updatedScript,
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("ScriptEditor", () => {
  it("renders one block per body segment plus the hook/CTA/caption blocks", () => {
    render(<ScriptEditor projectId={projectId} script={script} />);

    expect(screen.getByText(script.hook)).toBeTruthy();
    expect(screen.getAllByTestId("script-block")).toHaveLength(3);
    expect(screen.getByText(script.callToAction!)).toBeTruthy();
    expect(screen.getByText(script.caption!)).toBeTruthy();
  });

  it("shows a live word-count-based duration estimate alongside the saved duration", () => {
    render(<ScriptEditor projectId={projectId} script={script} />);

    expect(screen.getByText(/~\d+s estimated/)).toBeTruthy();
    expect(screen.getByText(/35s saved/)).toBeTruthy();
  });

  it("captures a targeted edit request for the hook block and sends it with locked fields", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(patchResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", request);

    render(<ScriptEditor projectId={projectId} script={script} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /ask ai to change this/i })[0]!,
    );
    expect(
      screen.getByRole("heading", { name: /change the hook block/i }),
    ).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Body"));
    fireEvent.change(screen.getByLabelText("Requested change"), {
      target: { value: "Make it punchier" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate this block/i }),
    );

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/projects/${projectId}/script`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          field: "hook",
          instruction: "Make it punchier",
          lockedFields: ["body"],
        }),
      }),
    );
    expect(await screen.findByText("Script block updated")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("captures a targeted edit anchored on a specific body passage", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(patchResult));
    vi.stubGlobal("fetch", request);

    render(<ScriptEditor projectId={projectId} script={script} />);

    fireEvent.click(
      screen.getAllByRole("button", {
        name: /ask ai to change this passage/i,
      })[1]!,
    );
    expect(screen.getByText(/^Currently: /)).toHaveProperty(
      "textContent",
      expect.stringContaining("Lower the needle"),
    );

    fireEvent.change(screen.getByLabelText("Requested change"), {
      target: { value: "Slow this beat down" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate this block/i }),
    );

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    const body = JSON.parse(
      (request.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.field).toBe("body");
    expect(body.instruction).toBe("Slow this beat down");
  });

  it("shows a clear error and does not refresh when the API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 422 })),
    );

    render(<ScriptEditor projectId={projectId} script={script} />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /ask ai to change this/i })[0]!,
    );
    fireEvent.change(screen.getByLabelText("Requested change"), {
      target: { value: "Make it punchier" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate this block/i }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(
      /could not honor a locked field|quality check/i,
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
