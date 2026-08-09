import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/src/lib/auth/client", () => ({
  authClient: { signOut: vi.fn().mockResolvedValue(undefined) },
}));

describe("AccountMenu", () => {
  it("makes credits, integrations and privacy reachable from every breakpoint", async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Morgan Boubault" initials="MB" />);

    await user.click(screen.getByRole("button", { name: "Morgan Boubault" }));

    const credits = await screen.findByRole("menuitem", { name: /credits/i });
    expect(credits.getAttribute("href")).toBe("/credits");

    expect(
      screen
        .getByRole("menuitem", { name: /integrations/i })
        .getAttribute("href"),
    ).toBe("/settings/integrations");
    expect(
      screen.getByRole("menuitem", { name: /privacy/i }).getAttribute("href"),
    ).toBe("/settings/privacy");
  });

  it("does not link to billing while /settings/billing has no real destination", async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Morgan Boubault" initials="MB" />);

    await user.click(screen.getByRole("button", { name: "Morgan Boubault" }));

    await screen.findByRole("menuitem", { name: /credits/i });
    expect(screen.queryByRole("menuitem", { name: /billing/i })).toBeNull();
  });
});
