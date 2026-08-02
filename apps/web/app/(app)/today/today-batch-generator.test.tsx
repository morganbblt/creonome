import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { TodayBatchGenerator } from "./today-batch-generator";

describe("TodayBatchGenerator", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("generates the selected idempotent batch and refreshes Today", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ opportunities: [] }));
    render(<TodayBatchGenerator />);

    fireEvent.click(screen.getByRole("button", { name: "More experimental" }));
    fireEvent.click(
      screen.getByRole("button", { name: /3 new opportunities/i }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      "/api/creonome/opportunities/batches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Idempotency-Key": expect.stringMatching(/^batch-/),
        }),
        body: JSON.stringify({ direction: "More experimental" }),
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
      .mockResolvedValueOnce(Response.json({ opportunities: [] }));
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
