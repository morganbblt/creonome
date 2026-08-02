import type { CreditLedgerEntry } from "@creonome/contracts";

export function creditMovement(entry: CreditLedgerEntry): number {
  if (entry.kind === "reservation" || entry.kind === "release") {
    return -entry.reservedDelta;
  }
  return entry.balanceDelta;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function creditLedgerCsv(entries: CreditLedgerEntry[]): string {
  const rows = entries.map((entry) =>
    [
      entry.id,
      entry.createdAt,
      entry.kind,
      entry.description,
      creditMovement(entry),
    ]
      .map(csvCell)
      .join(","),
  );
  return ["receipt_id,created_at,type,description,amount", ...rows].join("\n");
}
