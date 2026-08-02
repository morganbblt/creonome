import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditBalance, creditBalanceChangedEvent } from "./credit-balance";

describe("CreditBalance", () => {
  it("opens the detailed credit ledger", () => {
    render(<CreditBalance initialAvailable={60} />);

    expect(
      screen
        .getByRole("link", { name: "Available credits: 60" })
        .getAttribute("href"),
    ).toBe("/credits");
  });

  it("updates immediately when a paid generation commits credits", () => {
    render(<CreditBalance initialAvailable={60} />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(creditBalanceChangedEvent, { detail: 58 }),
      );
    });

    expect(screen.getByText("58 cr")).toBeTruthy();
  });

  it("syncs the server balance after a router refresh", () => {
    const { rerender } = render(<CreditBalance initialAvailable={52} />);

    rerender(<CreditBalance initialAvailable={49} />);

    expect(screen.getByText("49 cr")).toBeTruthy();
  });
});
