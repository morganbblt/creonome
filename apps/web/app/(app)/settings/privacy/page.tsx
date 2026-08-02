import type { Metadata } from "next";
import { loadPrivacy } from "@/src/features/privacy/privacy-data";
import { PrivacyWorkspace } from "@/src/features/privacy/privacy-workspace";
import { UnavailableState } from "@/src/features/management/unavailable-state";
import { createServerApiClient } from "@/src/lib/api/server-client";
import styles from "../../management.module.css";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const privacy = await loadPrivacy(createServerApiClient());
  if (privacy) return <PrivacyWorkspace initialState={privacy} />;

  return (
    <main className={styles.compactPage}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>CONTROL &amp; PORTABILITY</p>
          <h1>Your data</h1>
        </div>
      </header>
      <UnavailableState
        title="Privacy settings could not be loaded."
        description="Your preferences and private data are unchanged."
        actionHref="/settings/privacy"
      />
    </main>
  );
}
