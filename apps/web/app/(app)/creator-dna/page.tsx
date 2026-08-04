import type { Metadata } from "next";
import { loadCreatorDna } from "../../../src/features/creator-dna/creator-dna-data";
import { CreatorDnaView } from "../../../src/features/creator-dna/creator-dna-view";
import { loadMemoryCandidates } from "../../../src/features/creator-dna/memory-candidates-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../src/lib/api/server-client";

export const metadata: Metadata = { title: "Creator DNA" };

export default async function CreatorDnaPage() {
  const client = createServerApiClient();
  const [dna, memories] = await Promise.all([
    loadCreatorDna(client),
    loadMemoryCandidates(client),
  ]);
  if (dna) return <CreatorDnaView dna={dna} memories={memories} />;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5.5 pt-8 pb-16 max-[620px]:px-3.5 max-[620px]:pt-6 max-[620px]:pb-12">
      <h1 className="mb-5 text-3xl font-semibold tracking-tight text-foreground max-[620px]:text-2xl">
        Creator DNA
      </h1>
      <UnavailableState
        actionHref="/creator-dna"
        description="Your confirmed model is intact. Reconnect and try again."
        title="Creator DNA could not be loaded."
      />
    </main>
  );
}
