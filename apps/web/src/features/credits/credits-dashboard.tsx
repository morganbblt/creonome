"use client";

import type { CreditLedgerEntry } from "@creonome/contracts";
import Link from "next/link";
import type { CreditOverview } from "./credits-data";
import { creditLedgerCsv, creditMovement } from "./credit-ledger-export";
import styles from "./credits-dashboard.module.css";

const productionCosts = [
  { label: "scripts", cost: 2 },
  { label: "storyboards", cost: 4 },
  { label: "new batches", cost: 3 },
] as const;

const kindLabels: Record<CreditLedgerEntry["kind"], string> = {
  grant: "Granted",
  reservation: "Held",
  commit: "Spent",
  release: "Refunded",
  purchase: "Purchased",
  adjustment: "Adjusted",
};

function movementLabel(entry: CreditLedgerEntry): string {
  const movement = creditMovement(entry);
  return `${movement > 0 ? "+" : ""}${movement}`;
}

function downloadLedger(entries: CreditLedgerEntry[]) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff", creditLedgerCsv(entries)], {
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
      <main className={styles.page}>
        <section className={styles.unavailable} role="status">
          <span aria-hidden="true">↻</span>
          <div>
            <h1>Credits could not be loaded.</h1>
            <p>No balance was assumed. Your ledger remains intact.</p>
          </div>
          <Link href="/credits">Try again</Link>
        </section>
      </main>
    );
  }

  const { account, ledger } = overview;

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.balance}>
            <span>BALANCE</span>
            <div>
              <strong>{account.available}</strong>
              <small>credits</small>
            </div>
            <p>
              {account.reserved
                ? `${account.reserved} held on running work`
                : "No credits held"}
            </p>
          </div>

          <div className={styles.capacity}>
            <span>WHAT {account.available} BUYS</span>
            <div>
              {productionCosts.map(({ label, cost }) => {
                const count = Math.floor(account.available / cost);
                return (
                  <span
                    className={count ? undefined : styles.unaffordable}
                    key={label}
                  >
                    {count ? `${count} ${label}` : `${label} · needs ${cost}`}
                  </span>
                );
              })}
              <span className={styles.unaffordable}>
                Full video · coming later
              </span>
            </div>
            <p>Changes made in the chat never cost credits.</p>
          </div>

          <div className={styles.billingActions}>
            <button
              disabled
              title="Purchases are disabled during the hackathon"
              type="button"
            >
              Buy credits
            </button>
            <Link href="/settings/billing">View demo plans</Link>
            <span>Studio · mock billing</span>
          </div>
        </header>

        <div className={styles.ledger}>
          <div className={styles.ledgerTitle}>
            <div>
              <h1>Credits</h1>
              <p>Immutable ledger · every movement receipted</p>
            </div>
            <button
              disabled={!ledger.entries.length}
              onClick={() => downloadLedger(ledger.entries)}
              type="button"
            >
              Export CSV
            </button>
          </div>

          {ledger.entries.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Type</th>
                    <th scope="col">Receipt</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((entry) => (
                    <tr data-kind={entry.kind} key={entry.id}>
                      <td>
                        <time dateTime={entry.createdAt}>
                          {new Intl.DateTimeFormat("en", {
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                          }).format(new Date(entry.createdAt))}
                        </time>
                      </td>
                      <td>{entry.description}</td>
                      <td>{kindLabels[entry.kind]}</td>
                      <td title={entry.id}>{entry.id.slice(0, 8)}</td>
                      <td>{movementLabel(entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>No credit movements yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
