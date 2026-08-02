import type { Metadata } from "next";
import Link from "next/link";
import { loadCreatorDna } from "../../../src/features/creator-dna/creator-dna-data";
import { CreatorDnaView } from "../../../src/features/creator-dna/creator-dna-view";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import managementStyles from "../management.module.css";

export const metadata: Metadata = { title: "Creator DNA" };

export default async function CreatorDnaPage() {
  const dna = await loadCreatorDna(createServerApiClient());
  if (dna) return <CreatorDnaView dna={dna} />;

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
