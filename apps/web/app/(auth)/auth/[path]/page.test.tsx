import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@neondatabase/auth-ui", () => ({
  AuthView: ({ path, redirectTo }: { path: string; redirectTo: string }) => (
    <div data-path={path} data-redirect-to={redirectTo}>
      Authentication
    </div>
  ),
}));

import AuthPage from "./page";

describe("AuthPage", () => {
  it("sends every successful authentication through onboarding", async () => {
    render(
      await AuthPage({
        params: Promise.resolve({ path: "sign-in" }),
      }),
    );

    expect(
      screen.getByText("Authentication").getAttribute("data-redirect-to"),
    ).toBe("/onboarding");
  });
});
