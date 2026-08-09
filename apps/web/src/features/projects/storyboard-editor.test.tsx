import type { ProjectStoryboard } from "@creonome/contracts";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryboardEditor } from "./storyboard-editor";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const projectId = "0198f3a2-82dd-7000-8000-000000000020";
const sceneOneId = "0198f3a2-82dd-7000-8000-000000000031";
const sceneTwoId = "0198f3a2-82dd-7000-8000-000000000032";
const sceneThreeId = "0198f3a2-82dd-7000-8000-000000000033";

function scene(overrides: Partial<ProjectStoryboard["scenes"][number]>) {
  return {
    id: sceneOneId,
    position: 1,
    startSeconds: 0,
    heading: "Hold the room",
    description: "Locked close-up on the silent speaker cone.",
    shotType: "Extreme close-up",
    voiceover: "Hold the empty room.",
    onScreenText: "Before the drop",
    bRoll: null,
    transition: null,
    requiredAsset: null,
    sound: null,
    editingNote: null,
    referenceFrameUrl: null,
    durationSeconds: 10,
    ...overrides,
  };
}

const storyboard: ProjectStoryboard = {
  id: "0198f3a2-82dd-7000-8000-000000000030",
  title: "Warehouse tape loop",
  aspectRatio: "9:16",
  durationSeconds: 30,
  scenes: [
    scene({
      id: sceneOneId,
      position: 1,
      startSeconds: 0,
      heading: "Silence",
    }),
    scene({
      id: sceneTwoId,
      position: 2,
      startSeconds: 10,
      heading: "The gesture",
      voiceover: "Lower the needle.",
    }),
    scene({
      id: sceneThreeId,
      position: 3,
      startSeconds: 20,
      heading: "The reveal",
      voiceover: "Then let it land.",
    }),
  ],
};

function projectPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: projectId,
    opportunityId: null,
    title: storyboard.title,
    status: "active",
    currentLevel: "storyboard",
    currentVersion: 4,
    updatedAt: "2026-08-02T10:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("StoryboardEditor", () => {
  it("renders every scene in the rail", () => {
    render(<StoryboardEditor projectId={projectId} storyboard={storyboard} />);

    expect(screen.getByRole("heading", { name: "01 · Silence" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "02 · The gesture" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "03 · The reveal" }),
    ).toBeTruthy();
  });

  it("moves a scene later and persists the new order via the reorder endpoint", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        Response.json({ project: projectPayload(), storyboard }),
      );
    vi.stubGlobal("fetch", request);

    render(<StoryboardEditor projectId={projectId} storyboard={storyboard} />);

    fireEvent.click(screen.getByLabelText("Move scene 1 later"));

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/projects/${projectId}/storyboard/scenes/reorder`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          sceneIds: [sceneTwoId, sceneOneId, sceneThreeId],
        }),
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());

    // Optimistic reorder is reflected immediately in the rail's DOM order.
    const rail = screen.getByTestId("storyboard-rail");
    const headings = within(rail)
      .getAllByRole("heading")
      .map((heading) => heading.textContent);
    expect(headings[0]).toContain("The gesture");
    expect(headings[1]).toContain("Silence");
  });

  it("reverts the order and shows an error when the reorder request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    render(<StoryboardEditor projectId={projectId} storyboard={storyboard} />);
    fireEvent.click(screen.getByLabelText("Move scene 1 later"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not be saved/i);
    const rail = screen.getByTestId("storyboard-rail");
    const headings = within(rail)
      .getAllByRole("heading")
      .map((heading) => heading.textContent);
    expect(headings[0]).toContain("Silence"); // reverted
    expect(refresh).not.toHaveBeenCalled();
  });

  it("regenerates a single scene with locked fields, leaving the other scenes as returned by the API", async () => {
    const updatedStoryboard: ProjectStoryboard = {
      ...storyboard,
      scenes: [
        storyboard.scenes[0]!, // scene 1 untouched
        {
          ...storyboard.scenes[1]!,
          heading: "A completely new gesture",
          description: "Reworked beat.",
        },
        storyboard.scenes[2]!, // scene 3 untouched
      ],
    };
    const request = vi.fn().mockResolvedValue(
      Response.json({
        project: projectPayload(),
        storyboard: updatedStoryboard,
      }),
    );
    vi.stubGlobal("fetch", request);

    render(<StoryboardEditor projectId={projectId} storyboard={storyboard} />);

    const sceneTwoCard = screen
      .getByRole("heading", { name: "02 · The gesture" })
      .closest("article")!;
    fireEvent.click(
      within(sceneTwoCard).getByRole("button", {
        name: /regenerate this scene/i,
      }),
    );

    expect(
      screen.getByRole("heading", { name: /regenerate scene 02/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText("voiceover"));
    fireEvent.change(screen.getByLabelText("Requested change"), {
      target: { value: "Open on a wider shot" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^regenerate scene$/i }),
    );

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/projects/${projectId}/storyboard/scenes/${sceneTwoId}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          instruction: "Open on a wider shot",
          lockedFields: ["voiceover"],
        }),
      }),
    );
    // Only scene 2's endpoint was called — scenes 1 and 3 were never
    // addressed by this request.
    expect(request).not.toHaveBeenCalledWith(
      expect.stringContaining(`/scenes/${sceneOneId}`),
      expect.anything(),
    );
    expect(request).not.toHaveBeenCalledWith(
      expect.stringContaining(`/scenes/${sceneThreeId}`),
      expect.anything(),
    );
    expect(await screen.findByText("Storyboard updated")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
