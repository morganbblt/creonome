import type { Metadata } from "next";
import { loadCreatorDna } from "../../../src/features/creator-dna/creator-dna-data";
import { CreatorDnaView } from "../../../src/features/creator-dna/creator-dna-view";
import { loadMemoryCandidates } from "../../../src/features/creator-dna/memory-candidates-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import managementStyles from "../management.module.css";

export const metadata: Metadata = { title: "Creator DNA" };

export default async function CreatorDnaPage() {
  const client = createServerApiClient();
  const [dna, memories] = await Promise.all([
    loadCreatorDna(client),
    loadMemoryCandidates(client),
  ]);
  if (dna) return <CreatorDnaView dna={dna} memories={memories} />;

  return (
    <main className={managementStyles.page}>
      <header className={managementStyles.titleRow}>
        <div>
          <p className={managementStyles.eyebrow}>
            ARTISTIC &amp; CREATIVE MODEL
          </p>
          <h1>Creator DNA</h1>
        </div>
      </header>
      <UnavailableState
        title="Creator DNA could not be loaded."
        description="Your confirmed model is intact. Reconnect and try again."
        actionHref="/creator-dna"
      />
    </main>
  );
}
