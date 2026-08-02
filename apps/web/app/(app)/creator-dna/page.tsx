import type { Metadata } from "next";
import Link from "next/link";
import { loadCreatorDna } from "../../../src/features/creator-dna/creator-dna-data";
import { CreatorDnaView } from "../../../src/features/creator-dna/creator-dna-view";
import { loadMemoryCandidates } from "../../../src/features/creator-dna/memory-candidates-data";
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
      <section className={managementStyles.unavailableState} role="status">
        <span aria-hidden="true">↻</span>
        <div>
          <h2>Creator DNA could not be loaded.</h2>
          <p>Your confirmed model is intact. Reconnect and try again.</p>
        </div>
        <Link href="/creator-dna">Try again</Link>
      </section>
    </main>
  );
}
