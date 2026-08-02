import type { Metadata } from "next";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import { loadTodayOpportunities } from "../../../src/features/opportunities/today-data";
import { TodayCarousel } from "./today-carousel";
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
          batch 07 · {source === "api" ? "live workspace" : "MVP demo"}
        </span>
      </header>

      {source === "demo" ? (
        <p className={styles.previewNotice} role="status">
          MVP demo · Live generation is reconnecting. Preview these three routes
          now, or create a persisted batch below.
        </p>
      ) : null}

      <TodayCarousel
        opportunities={opportunities}
        preview={source === "demo"}
      />
    </main>
  );
}
