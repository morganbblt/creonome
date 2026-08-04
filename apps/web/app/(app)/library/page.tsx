import type { Metadata } from "next";
import { LibraryWorkspace } from "../../../src/features/library/library-workspace";
import { loadLibrary } from "../../../src/features/library/library-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../src/lib/api/server-client";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const { source, library } = await loadLibrary(createServerApiClient());
  if (source === "api") return <LibraryWorkspace library={library} />;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-8 pb-16 max-[680px]:px-3.5 max-[680px]:pt-6 max-[680px]:pb-12">
      <header className="mb-5">
        <p className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          Private creative storage
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Library
        </h1>
      </header>
      <UnavailableState
        title="Library could not be loaded."
        description="Your private assets are intact. Reconnect and try again."
        actionHref="/library"
      />
    </main>
  );
}
