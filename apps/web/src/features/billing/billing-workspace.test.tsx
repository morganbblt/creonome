import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillingWorkspace } from "./billing-workspace";
import { mockBilling } from "./mock-billing";

describe("BillingWorkspace", () => {
  it("labels the page as synthetic demo data", () => {
    render(<BillingWorkspace />);
    const notice = screen.getByRole("status");
    expect(notice.textContent).toBe(`MVP demo · ${mockBilling.notice}`);
  });

  it("renders every plan with the current one marked", () => {
    render(<BillingWorkspace />);
    for (const plan of mockBilling.plans) {
      expect(screen.getByText(plan.name)).toBeTruthy();
    }
    expect(screen.getAllByText("Current plan").length).toBeGreaterThan(0);
  });

  it("renders the invoice history", () => {
    render(<BillingWorkspace />);
    for (const invoice of mockBilling.invoices) {
      expect(screen.getAllByText(invoice.label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(mockBilling.invoices[0]!.issuedOn)).toHaveLength(
      1,
    );
  });

  it("renders the synthetic payment method, clearly not charged", () => {
    render(<BillingWorkspace />);
    expect(
      screen.getByText(
        `${mockBilling.paymentMethod.brand} •••• ${mockBilling.paymentMethod.lastFour}`,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/synthetic, not charged/)).toBeTruthy();
  });
});
