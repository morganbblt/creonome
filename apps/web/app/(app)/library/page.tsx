import type { Metadata } from "next";
import { LibraryWorkspace } from "../../../src/features/library/library-workspace";
import { loadLibrary } from "../../../src/features/library/library-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import managementStyles from "../management.module.css";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const { source, library } = await loadLibrary(createServerApiClient());
  if (source === "api") return <LibraryWorkspace library={library} />;

  return (
    <main className={managementStyles.page}>
      <header className={managementStyles.titleRow}>
        <div>
          <p className={managementStyles.eyebrow}>PRIVATE CREATIVE STORAGE</p>
          <h1>Library</h1>
        </div>
      </header>
      <UnavailableState
        title="Library could not be loaded."
        description="Your private assets are intact. Reconnect and try again."
        actionHref="/library"
      />
    </main>
  );
}
