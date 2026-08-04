import type { MemoryCandidatesResponse } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryControl } from "./memory-control";

const memories: MemoryCandidatesResponse = {
  pendingCount: 1,
  pending: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000061",
      status: "pending",
      kind: "creator",
      scope: "creator",
      confidence: 0.6,
      content: "Prefer implicit calls to action.",
      source: "opportunity_chat",
      provider: "mem0",
      projectId: "0198f3a2-82dd-7000-8000-000000000020",
      opportunityId: null,
      createdAt: "2026-08-02T06:00:00.000Z",
      reviewedAt: null,
    },
  ],
  history: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000062",
      status: "rejected",
      kind: "project",
      scope: "project",
      confidence: 0.6,
      content: "Use a louder opening.",
      source: "opportunity_chat",
      provider: "mem0",
      projectId: null,
      opportunityId: null,
      createdAt: "2026-08-01T06:00:00.000Z",
      reviewedAt: "2026-08-01T06:10:00.000Z",
    },
  ],
};

describe("MemoryControl", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("approves a candidate and moves it into visible history", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: memories.pending[0]!.id,
        status: "approved",
        providerStatus: "pending",
        providerEventId: "event-1",
        reviewedAt: "2026-08-02T06:10:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<MemoryControl initialMemories={memories} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept memory" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        `/api/creonome/memory-candidates/${memories.pending[0]!.id}/approve`,
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(screen.queryByRole("button", { name: "Accept memory" })).toBeNull();
    expect(screen.getByText("Approved", { exact: false })).toBeTruthy();
    expect(screen.getByText("No memory awaiting review.")).toBeTruthy();
  });

  it("rejects a candidate without sending an approval request", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: memories.pending[0]!.id,
        status: "rejected",
        providerStatus: null,
        providerEventId: null,
        reviewedAt: "2026-08-02T06:10:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<MemoryControl initialMemories={memories} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject memory" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        `/api/creonome/memory-candidates/${memories.pending[0]!.id}/reject`,
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(screen.getAllByText("Rejected", { exact: false })).toHaveLength(2);
  });

  it("keeps a candidate in place when its decision cannot be saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "Unavailable" }, { status: 503 }),
        ),
    );
    render(<MemoryControl initialMemories={memories} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept memory" }));

    expect(
      await screen.findByText(
        "The memory decision could not be saved. Nothing changed.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept memory" })).toBeTruthy();
  });
});
