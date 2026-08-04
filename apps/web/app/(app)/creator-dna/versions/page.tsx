import type { Metadata } from "next";
import { CreatorDnaVersionsView } from "../../../../src/features/creator-dna/creator-dna-versions-view";
import { loadCreatorDnaVersions } from "../../../../src/features/creator-dna/creator-dna-versions-data";
import { UnavailableState } from "../../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../../src/lib/api/server-client";

export const metadata: Metadata = { title: "Creator DNA — version history" };

export default async function CreatorDnaVersionsPage() {
  const client = createServerApiClient();
  const versions = await loadCreatorDnaVersions(client);
  if (versions) return <CreatorDnaVersionsView versions={versions} />;

  return (
    <main className="mx-auto w-full max-w-[900px] px-5.5 pt-8 pb-16 max-[620px]:px-3.5 max-[620px]:pt-6 max-[620px]:pb-12">
      <h1 className="mb-5 text-3xl font-semibold tracking-tight text-foreground max-[620px]:text-2xl">
        Version history
      </h1>
      <UnavailableState
        actionHref="/creator-dna/versions"
        description="Your Creator DNA versions are intact. Reconnect and try again."
        title="Version history could not be loaded."
      />
    </main>
  );
}
