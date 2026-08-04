import type { Metadata } from "next";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import { loadTodayOpportunities } from "../../../src/features/opportunities/today-data";
import { TodayCarousel } from "./today-carousel";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const { opportunities, source } = await loadTodayOpportunities(
    createServerApiClient(),
  );

  return (
    <main className="mx-auto w-full max-w-[1324px] px-5.5 pt-8.5 pb-12 max-[620px]:px-3.5 max-[620px]:pt-6.5 max-[620px]:pb-9">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-6 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className="mb-2 font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Today · Warehouse tapes
          </p>
          <h1 className="m-0 max-w-[720px] text-[clamp(30px,4vw,46px)] leading-[1.05] font-semibold tracking-[-0.04em] text-foreground text-balance">
            Three routes worth making this week.
          </h1>
          <p className="mt-3.5 text-sm text-muted-foreground">
            Three bets for the{" "}
            <strong className="font-semibold text-foreground">
              Warehouse Tapes
            </strong>{" "}
            window. Not a ranking.
          </p>
        </div>
        <span className="pb-1 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          batch 07 · {source === "api" ? "live workspace" : "MVP demo"}
        </span>
      </header>

      {source === "demo" ? (
        <p
          className="mb-4 rounded-control border border-border bg-secondary px-3.5 py-2.5 font-mono text-[11px] leading-[1.5] text-muted-foreground"
          role="status"
        >
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
