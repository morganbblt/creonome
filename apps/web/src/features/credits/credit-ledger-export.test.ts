import type { CreditLedgerEntry } from "@creonome/contracts";
import { describe, expect, it } from "vitest";
import { creditLedgerCsv, creditMovement } from "./credit-ledger-export";

const entries: CreditLedgerEntry[] = [
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
    description: 'Script, "Warehouse tape loop"',
    createdAt: "2026-08-02T06:00:00.000Z",
  },
];

describe("credit ledger export", () => {
  it("represents reservations and releases as understandable movements", () => {
    expect(creditMovement(entries[0]!)).toBe(4);
    expect(creditMovement(entries[1]!)).toBe(-2);
    expect(
      creditMovement({
        ...entries[1]!,
        kind: "reservation",
        balanceDelta: 0,
        reservedDelta: 4,
      }),
    ).toBe(-4);
  });

  it("exports a spreadsheet-safe CSV with every receipt", () => {
    const csv = creditLedgerCsv(entries);

    expect(csv).toContain("receipt_id,created_at,type,description,amount");
    expect(csv).toContain('"Script, ""Warehouse tape loop"""');
    expect(csv).toContain(",release,");
    expect(csv.split("\n")).toHaveLength(3);
  });
});
