import type { Metadata } from "next";
import Link from "next/link";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import { loadTodayOpportunities } from "../../../src/features/opportunities/today-data";
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
            <article className={styles.card} key={opportunity.id} tabIndex={0}>
              <div className={styles.cardMeta}>
                <span
                  className={`${styles.badge} ${styles[opportunity.strategy]}`}
                >
                  <span aria-hidden="true" />
                  {opportunity.badge}
                </span>
                <span>{opportunity.duration}</span>
              </div>

              <div
                className={styles.media}
                role="img"
                aria-label={`Synthetic portrait frame for ${opportunity.title}`}
              >
                <span className={styles.frameLeft} />
                <span className={styles.frameRight} />
                <span className={styles.frameFront}>9:16</span>
              </div>

              <div className={styles.summary}>
                <h2>{opportunity.title}</h2>
                <p>{opportunity.pitch}</p>
              </div>

              <div className={styles.details}>
                <div className={styles.hook}>
                  <span>HOOK</span>
                  <p>{opportunity.hook}</p>
                </div>
                <div className={styles.score}>
                  <div>
                    <strong>{opportunity.score}</strong>
                    <span>/100</span>
                    <em>{opportunity.verdict}</em>
                  </div>
                  <p>
                    {opportunity.confidence} confidence · {opportunity.effort} ·{" "}
                    {opportunity.channel}
                  </p>
                  <span>WHY</span>
                  <p>{opportunity.why}</p>
                  <p>
                    <strong>Reserve —</strong> {opportunity.reserve}
                  </p>
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.splitButton}>
                  <Link href={`/opportunities/${opportunity.id}`}>
                    Move to script <span>{opportunity.creditCost} cr</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={`More actions for ${opportunity.title}`}
                  >
                    ⌄
                  </button>
                </div>
                <Link
                  href={`/opportunities/${opportunity.id}?panel=modify`}
                  className={styles.modify}
                  aria-label={`Modify ${opportunity.title}`}
                >
                  ✎
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {source === "api" ? (
        <section
          className={styles.newBatch}
          aria-label="Generate another batch"
        >
          <button type="button">+ 3 new opportunities · 3 credits</button>
          <div>
            <span>Closer to my DNA</span>
            <span>More experimental</span>
            <span>Easier to shoot</span>
          </div>
          <p>previous batch stays in Projects</p>
        </section>
      ) : null}
    </main>
  );
}
