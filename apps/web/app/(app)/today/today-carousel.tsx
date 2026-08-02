"use client";

import type { OpportunityBatch } from "@creonome/contracts";
import { useEffect, useRef, useState } from "react";
import type { DemoOpportunity } from "../../../src/features/opportunities/demo-opportunities";
import { presentOpportunity } from "../../../src/features/opportunities/today-data";
import { TodayBatchGenerator } from "./today-batch-generator";
import { TodayOpportunityCard } from "./today-opportunity-card";
import styles from "./today.module.css";

type CarouselEntry = {
  opportunity: DemoOpportunity;
  preview: boolean;
};

function mergeEntries(
  current: CarouselEntry[],
  incoming: CarouselEntry[],
): CarouselEntry[] {
  const knownIds = new Set(current.map(({ opportunity }) => opportunity.id));
  return [
    ...current,
    ...incoming.filter(({ opportunity }) => !knownIds.has(opportunity.id)),
  ];
}

export function TodayCarousel({
  opportunities,
  preview,
}: {
  opportunities: DemoOpportunity[];
  preview: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<CarouselEntry[]>(() =>
    opportunities.map((opportunity) => ({ opportunity, preview })),
  );

  useEffect(() => {
    setEntries((current) =>
      mergeEntries(
        current,
        opportunities.map((opportunity) => ({ opportunity, preview })),
      ),
    );
  }, [opportunities, preview]);

  function move(direction: -1 | 1) {
    const viewport = track.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(280, viewport.clientWidth * 0.88),
      behavior: "smooth",
    });
  }

  function appendBatch(batch: OpportunityBatch) {
    setEntries((current) =>
      mergeEntries(
        current,
        batch.opportunities.map((opportunity) => ({
          opportunity: presentOpportunity(opportunity),
          preview: false,
        })),
      ),
    );
  }

  return (
    <>
      <section className={styles.carousel} aria-label="Creative opportunities">
        <div className={styles.carouselControls}>
          <span>{entries.length} opportunities</span>
          <button
            type="button"
            aria-label="Previous opportunities"
            onClick={() => move(-1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next opportunities"
            onClick={() => move(1)}
          >
            →
          </button>
        </div>
        <div className={styles.carouselTrack} ref={track}>
          {entries.map(({ opportunity, preview: entryPreview }) => (
            <TodayOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              preview={entryPreview}
            />
          ))}
        </div>
      </section>

      <section className={styles.newBatch} aria-label="Generate another batch">
        <TodayBatchGenerator preview={preview} onGenerated={appendBatch} />
      </section>
    </>
  );
}
