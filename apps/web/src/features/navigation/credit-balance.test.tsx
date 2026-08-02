import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditBalance, creditBalanceChangedEvent } from "./credit-balance";

describe("CreditBalance", () => {
  it("updates immediately when a paid generation commits credits", () => {
    render(<CreditBalance initialAvailable={60} />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(creditBalanceChangedEvent, { detail: 58 }),
      );
    });

    expect(screen.getByText("58 cr")).toBeTruthy();
  });
});
