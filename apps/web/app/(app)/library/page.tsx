import type { Metadata } from "next";
import Link from "next/link";
import { LibraryWorkspace } from "../../../src/features/library/library-workspace";
import { loadLibrary } from "../../../src/features/library/library-data";
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
      <section className={managementStyles.unavailableState} role="status">
        <span aria-hidden="true">↻</span>
        <div>
          <h2>Library could not be loaded.</h2>
          <p>Your private assets are intact. Reconnect and try again.</p>
        </div>
        <Link href="/library">Try again</Link>
      </section>
    </main>
  );
}
