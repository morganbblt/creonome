"use client";

import type { CreditLedgerEntry } from "@creonome/contracts";
import { CreditCardIcon, DownloadIcon } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";
import { UnavailableState } from "@/src/features/management/unavailable-state";
import { cn } from "@/src/lib/utils";
import { creditLedgerCsv, creditMovement } from "./credit-ledger-export";
import type { CreditOverview } from "./credits-data";

const productionCosts = [
  { label: "scripts", cost: 2 },
  { label: "storyboards", cost: 4 },
  { label: "new batches", cost: 3 },
  { label: "full videos", cost: 12 },
] as const;

const kindLabels: Record<CreditLedgerEntry["kind"], string> = {
  grant: "Granted",
  reservation: "Held",
  commit: "Spent",
  release: "Refunded",
  purchase: "Purchased",
  adjustment: "Adjusted",
};

// Refunds are the one movement worth calling out — everything else stays
// neutral so the signature accent isn't diluted into a general status color.
const kindBadgeVariant: Record<CreditLedgerEntry["kind"], "accent" | "outline"> = {
  grant: "outline",
  reservation: "outline",
  commit: "outline",
  release: "accent",
  purchase: "outline",
  adjustment: "outline",
};

function movementLabel(entry: CreditLedgerEntry): string {
  const movement = creditMovement(entry);
  return `${movement > 0 ? "+" : ""}${movement}`;
}

function downloadLedger(entries: CreditLedgerEntry[]) {
  const url = URL.createObjectURL(
    new Blob(["﻿", creditLedgerCsv(entries)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "creonome-credit-ledger.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CreditsDashboard({
  overview,
}: {
  overview: CreditOverview | null;
}) {
  if (!overview) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        <UnavailableState
          title="Credits could not be loaded."
          description="No balance was assumed. Your ledger remains intact."
          actionHref="/credits"
        />
      </main>
    );
  }

  const { account, ledger } = overview;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Credits
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable ledger · every movement receipted
          </p>
        </div>
        <Button
          disabled={!ledger.entries.length}
          onClick={() => downloadLedger(ledger.entries)}
          size="sm"
          variant="outline"
        >
          <DownloadIcon />
          Export CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
          <div className="flex flex-col gap-2 sm:w-44 sm:shrink-0">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Balance
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="font-mono text-5xl font-semibold tracking-tight text-foreground tabular-nums">
                {account.available}
              </strong>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {account.reserved
                ? `${account.reserved} held on running work`
                : "No credits held"}
            </p>
          </div>

          <Separator className="sm:hidden" />
          <Separator className="hidden sm:block" orientation="vertical" />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              What {account.available} buys
            </span>
            <div className="flex flex-wrap gap-2">
              {productionCosts.map(({ label, cost }) => {
                const count = Math.floor(account.available / cost);
                return (
                  <Badge
                    className={cn(!count && "border-dashed text-muted-foreground")}
                    key={label}
                    variant={count ? "default" : "outline"}
                  >
                    {count ? `${count} ${label}` : `${label} · needs ${cost}`}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Changes made in the chat never cost credits.
            </p>
          </div>

          <Separator className="sm:hidden" />
          <Separator className="hidden sm:block" orientation="vertical" />

          <div className="flex flex-col items-start gap-2 sm:w-44 sm:shrink-0 sm:items-end sm:text-right">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Billing
            </span>
            <Button
              disabled
              size="sm"
              title="Purchasing credits isn't available yet"
              variant="outline"
            >
              <CreditCardIcon />
              Buy credits
            </Button>
            <p className="text-xs text-muted-foreground">Plans coming later</p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Ledger</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every credit movement, receipted
          </p>
        </div>

        {ledger.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th
                    className="border-b border-border px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    scope="col"
                  >
                    Date
                  </th>
                  <th
                    className="border-b border-border px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    scope="col"
                  >
                    Reason
                  </th>
                  <th
                    className="border-b border-border px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    scope="col"
                  >
                    Type
                  </th>
                  <th
                    className="hidden border-b border-border px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:table-cell"
                    scope="col"
                  >
                    Receipt
                  </th>
                  <th
                    className="border-b border-border px-5 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    scope="col"
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((entry) => {
                  const movement = creditMovement(entry);
                  return (
                    <tr key={entry.id}>
                      <td className="border-b border-border px-5 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        <time className="font-mono" dateTime={entry.createdAt}>
                          {new Intl.DateTimeFormat("en", {
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                          }).format(new Date(entry.createdAt))}
                        </time>
                      </td>
                      <td className="border-b border-border px-5 py-3 text-foreground">
                        {entry.description}
                      </td>
                      <td className="border-b border-border px-5 py-3">
                        <Badge variant={kindBadgeVariant[entry.kind]}>
                          {kindLabels[entry.kind]}
                        </Badge>
                      </td>
                      <td
                        className="hidden border-b border-border px-5 py-3 font-mono text-xs text-muted-foreground sm:table-cell"
                        title={entry.id}
                      >
                        {entry.id.slice(0, 8)}
                      </td>
                      <td
                        className={cn(
                          "border-b border-border px-5 py-3 text-right font-mono font-medium tabular-nums",
                          movement > 0 ? "text-success" : "text-foreground",
                        )}
                      >
                        {movementLabel(entry)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No credit movements yet.
          </p>
        )}
      </Card>
    </main>
  );
}
