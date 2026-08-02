import type { Metadata } from "next";
import Link from "next/link";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import { loadTodayOpportunities } from "../../../src/features/opportunities/today-data";
import { TodayBatchGenerator } from "./today-batch-generator";
import { TodayOpportunityCard } from "./today-opportunity-card";
import styles from "./today.module.css";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const { opportunities, source } = await loadTodayOpportunities(
    createServerApiClient(),
  );

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>TODAY · WAREHOUSE TAPES</p>
          <h1>Three routes worth making this week.</h1>
          <p>
            Three bets for the <strong>Warehouse Tapes</strong> window. Not a
            ranking.
          </p>
        </div>
        <span className={styles.batch}>
          batch 07 ·{" "}
          {source === "api" ? "live workspace" : "temporarily unavailable"}
        </span>
      </header>

      {source === "unavailable" ? (
        <section className={styles.unavailable} role="status">
          <span aria-hidden="true">↻</span>
          <div>
            <h2>We couldn’t load this week’s opportunities.</h2>
            <p>
              Nothing was charged. Try again to reconnect to your live
              workspace.
            </p>
          </div>
          <Link href="/today">Try again</Link>
        </section>
      ) : (
        <section
          className={styles.grid}
          aria-label="This week’s creative opportunities"
        >
          {opportunities.map((opportunity) => (
            <TodayOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </section>
      )}

      {source === "api" ? (
        <section
          className={styles.newBatch}
          aria-label="Generate another batch"
        >
          <TodayBatchGenerator />
        </section>
      ) : null}
    </main>
  );
}
