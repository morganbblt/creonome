import type { Metadata } from "next";
import { loadPrivacy } from "@/src/features/privacy/privacy-data";
import { PrivacyWorkspace } from "@/src/features/privacy/privacy-workspace";
import { UnavailableState } from "@/src/features/management/unavailable-state";
import { createServerApiClient } from "@/src/lib/api/server-client";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const privacy = await loadPrivacy(createServerApiClient());
  if (privacy) return <PrivacyWorkspace initialState={privacy} />;

  return (
    <main className="mx-auto w-full max-w-[720px] px-5.5 py-8.5 pb-14">
      <header className="mb-5.5">
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
          Control &amp; portability
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your data
        </h1>
      </header>
      <UnavailableState
        title="Privacy settings could not be loaded."
        description="Your preferences and private data are unchanged."
        actionHref="/settings/privacy"
      />
    </main>
  );
}
