import type { CreditLedger, CreditsResponse } from "@creonome/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditsDashboard } from "./credits-dashboard";

const account: CreditsResponse = {
  balance: 60,
  reserved: 2,
  available: 58,
};
const ledger: CreditLedger = {
  entries: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000071",
      kind: "release",
      balanceDelta: 0,
      reservedDelta: -4,
      description: "Released 4 credits after failed storyboard generation",
      createdAt: "2026-08-02T06:10:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000072",
      kind: "commit",
      balanceDelta: -2,
      reservedDelta: -2,
      description: "Committed 2 credits for script generation",
      createdAt: "2026-08-02T06:00:00.000Z",
    },
  ],
};

describe("CreditsDashboard", () => {
  it("turns the real balance and ledger into production decisions", () => {
    render(<CreditsDashboard overview={{ account, ledger }} />);

    expect(screen.getByRole("heading", { name: "Credits" })).toBeTruthy();
    expect(screen.getByText("58")).toBeTruthy();
    expect(screen.getByText(/2 held on running work/i)).toBeTruthy();
    expect(screen.getByText("29 scripts")).toBeTruthy();
    expect(screen.getByText("14 storyboards")).toBeTruthy();
    expect(screen.getByText("Full video · coming later")).toBeTruthy();
    expect(screen.queryByText("4 full videos")).toBeNull();
    expect(screen.getByText("Refunded")).toBeTruthy();
    expect(screen.getByText(/failed storyboard generation/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "View demo plans" })
        .getAttribute("href"),
    ).toBe("/settings/billing");
  });

  it("keeps billing actions disabled while Stripe is outside the MVP", () => {
    render(<CreditsDashboard overview={{ account, ledger }} />);

    expect(
      (
        screen.getByRole("button", {
          name: "Buy credits",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows a recoverable state without inventing a balance", () => {
    render(<CreditsDashboard overview={null} />);

    expect(screen.getByText("Credits could not be loaded.")).toBeTruthy();
    expect(screen.queryByText("58")).toBeNull();
  });
});
