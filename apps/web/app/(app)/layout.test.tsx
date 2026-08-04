import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getSession = vi.fn().mockResolvedValue({
  data: {
    user: {
      name: "Morgan Boubault",
      email: "morgan@example.com",
    },
  },
});

vi.mock("../../src/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    getCredits: vi.fn().mockResolvedValue({ available: 60 }),
  }),
}));

vi.mock("../../src/lib/auth/server", () => ({
  getAuth: () => ({ getSession }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AppLayout, { dynamic } from "./layout";

describe("authenticated app layout", () => {
  it("always renders workspace-scoped data per request", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders the signed-in Neon Auth identity instead of a sample creator", async () => {
    render(await AppLayout({ children: <main>Workspace</main> }));

    expect(screen.getByLabelText("Morgan Boubault").textContent).toBe("MB");
    expect(screen.queryByLabelText("Nova Sainte")).toBeNull();
  });

  it("keeps the shell usable when the session identity cannot be loaded", async () => {
    getSession.mockRejectedValueOnce(new Error("Auth temporarily unavailable"));

    render(await AppLayout({ children: <main>Workspace</main> }));

    expect(screen.getByLabelText("Creator").textContent).toBe("CR");
  });

  it("offers theme control without exposing the future payment page", async () => {
    render(await AppLayout({ children: <main>Workspace</main> }));

    expect(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});
