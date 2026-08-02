import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoUpgrade } from "./video-upgrade";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const projectId = "0198f3a2-82dd-7000-8000-000000000020";
const result = {
  project: {
    id: projectId,
    opportunityId: "0198f3a2-82dd-7000-8000-000000000013",
    title: "The silence before the drop",
    status: "active",
    currentLevel: "video",
    currentVersion: 4,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  video: {
    id: "0198f3a2-82dd-7000-8000-000000000060",
    projectId,
    previewUrl: "/demo/creonome-vertical-demo.mp4",
    mimeType: "video/mp4",
    durationSeconds: 30,
    width: 540,
    height: 960,
    provider: "creonome",
    model: "deterministic-motion-preview-v1",
    simulated: true,
    createdAt: "2026-08-02T10:00:00.000Z",
  },
  job: {
    id: "0198f3a2-82dd-7000-8000-000000000061",
    kind: "video_render",
    provider: "creonome",
    model: "mvp-motion-preview-v1",
    status: "succeeded",
    progress: 100,
    errorCode: null,
    errorMessage: null,
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    completedAt: "2026-08-02T10:00:00.000Z",
  },
  credits: { balance: 42, reserved: 0, available: 42 },
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("VideoUpgrade", () => {
  it("moves a confirmed render into a non-blocking toast and refreshes", async () => {
    let resolveRequest!: (response: Response) => void;
    const request = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<VideoUpgrade projectId={projectId} />);

    fireEvent.click(
      screen.getByRole("button", { name: /generate video · 12 cr/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /confirm and generate/i }),
    );

    expect(screen.getByRole("status").textContent).toMatch(
      /rendering your vertical video.*12 credits held/i,
    );
    expect(screen.getByText(/you can keep working/i)).toBeTruthy();
    resolveRequest(Response.json(result));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(
      screen.getByText("Video preview ready — generated with MVP fallback."),
    ).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/projects/${projectId}/upgrade`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          targetLevel: "video",
          confirmedCreditCost: true,
        }),
      }),
    );
  });
});
