"use client";

import type { OpportunityBatch } from "@creonome/contracts";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import type { DemoOpportunity } from "../../../src/features/opportunities/demo-opportunities";
import { presentOpportunity } from "../../../src/features/opportunities/today-data";
import { TodayBatchGenerator } from "./today-batch-generator";
import { TodayOpportunityCard } from "./today-opportunity-card";

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
      <section
        className="min-w-0"
        aria-label="Creative opportunities"
      >
        <div className="mb-2.5 flex items-center justify-end gap-1.5">
          <span className="mr-1 font-mono text-[10px] text-muted-foreground">
            {entries.length} opportunities
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous opportunities"
            onClick={() => move(-1)}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next opportunities"
            onClick={() => move(1)}
          >
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        <div
          className="grid snap-x snap-mandatory grid-flow-col items-start gap-5 overflow-x-auto px-0.5 pt-0.5 pb-4.5 [grid-auto-columns:calc((100%-40px)/3)] max-[980px]:[grid-auto-columns:calc((100%-20px)/2)] max-[620px]:[grid-auto-columns:min(88vw,360px)]"
          ref={track}
        >
          {entries.map(({ opportunity, preview: entryPreview }) => (
            <div key={opportunity.id} className="h-full snap-start">
              <TodayOpportunityCard
                opportunity={opportunity}
                preview={entryPreview}
              />
            </div>
          ))}
        </div>
      </section>

      <section
        className="mt-5 flex flex-wrap items-center gap-3.5 rounded-panel border border-dashed border-input p-4 max-[980px]:flex-col max-[980px]:items-start"
        aria-label="Generate another batch"
      >
        <TodayBatchGenerator preview={preview} onGenerated={appendBatch} />
      </section>
    </>
  );
}
