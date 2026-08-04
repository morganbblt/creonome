import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getSession, redirect } = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/src/lib/auth/server", () => ({
  getAuth: () => ({ getSession }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import HomePage, { dynamic } from "./page";

describe("root page", () => {
  it("renders per request instead of once at build time, so signed-in visitors always get redirected", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("shows the landing page when there is no active session", async () => {
    getSession.mockResolvedValue({ data: null });

    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: /know what to make next/i }),
    ).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("also shows the landing page if the session lookup fails", async () => {
    getSession.mockRejectedValue(new Error("offline"));

    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: /know what to make next/i }),
    ).toBeTruthy();
  });

  it("sends signed-in visitors straight to Today instead of the pitch", async () => {
    getSession.mockResolvedValue({
      data: { user: { name: "Morgan", email: "morgan@example.com" } },
    });

    await HomePage();

    expect(redirect).toHaveBeenCalledWith("/today");
  });
});
