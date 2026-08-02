import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/src/lib/auth/client", () => ({ authClient: {} }));

vi.mock("@neondatabase/auth-ui", () => ({
  NeonAuthUIProvider: ({
    children,
    social,
    redirectTo,
  }: {
    children: ReactNode;
    social?: { providers?: string[] };
    redirectTo?: string;
  }) => (
    <div
      data-social-providers={social?.providers?.join(",")}
      data-redirect-to={redirectTo}
    >
      {children}
    </div>
  ),
}));

describe("AuthProvider", () => {
  it("exposes Google as the only social sign-in provider", () => {
    render(
      <AuthProvider>
        <span>Authentication</span>
      </AuthProvider>,
    );

    expect(
      screen
        .getByText("Authentication")
        .parentElement?.getAttribute("data-social-providers"),
    ).toBe("google");
    expect(
      screen
        .getByText("Authentication")
        .parentElement?.getAttribute("data-redirect-to"),
    ).toBe("/onboarding");
  });
});
