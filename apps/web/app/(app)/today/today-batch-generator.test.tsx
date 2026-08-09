import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";
import { TodayBatchGenerator } from "./today-batch-generator";

const generatedBatch = {
  generatedAt: "2026-08-02T10:00:00.000Z",
  fallback: false,
  opportunities: demoOpportunities.map(
    ({
      badge: _badge,
      duration: _duration,
      hook: _hook,
      why: _why,
      reserve: _reserve,
      verdict: _verdict,
      effort: _effort,
      channel: _channel,
      ...opportunity
    }) => opportunity,
  ),
};

describe("TodayBatchGenerator", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("combines multiple filters and returns the generated batch", async () => {
    const onGenerated = vi.fn();
    vi.mocked(fetch).mockResolvedValue(Response.json(generatedBatch));
    render(<TodayBatchGenerator onGenerated={onGenerated} />);

    fireEvent.click(screen.getByRole("button", { name: "More experimental" }));
    expect(
      screen
        .getByRole("button", { name: "Closer to my DNA" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "More experimental" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: /3 new opportunities/i }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(onGenerated).toHaveBeenCalledWith(generatedBatch);
    expect(fetch).toHaveBeenCalledWith(
      "/api/creonome/opportunities/batches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Idempotency-Key": expect.stringMatching(/^batch-/),
        }),
        body: JSON.stringify({
          directions: ["Closer to my DNA", "More experimental"],
        }),
      }),
    );
  });

  it("starts a fresh idempotent request after a released generation", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json(
          { message: "unavailable", retryMode: "new_request" },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(Response.json(generatedBatch));
    render(<TodayBatchGenerator />);

    fireEvent.click(
      screen.getByRole("button", { name: /3 new opportunities/i }),
    );

    expect(await screen.findByText(/start a fresh request/i)).not.toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /3 new opportunities/i,
      }).disabled,
    ).toBe(false);
    const firstKey = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;

    fireEvent.click(
      screen.getByRole("button", { name: /3 new opportunities/i }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    const secondKey = vi.mocked(fetch).mock.calls[1]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(secondKey["Idempotency-Key"]).not.toBe(firstKey["Idempotency-Key"]);
  });
});
