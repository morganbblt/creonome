import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingWorkspace } from "@/src/features/onboarding/onboarding-workspace";
import { createServerApiClient } from "@/src/lib/api/server-client";

export const metadata: Metadata = { title: "Build your Creator DNA" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const state = await createServerApiClient()
    .getOnboarding()
    .catch(() => null);

  if (!state) {
    return (
      <main
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <section
          role="status"
          style={{
            width: "min(440px, 100%)",
            padding: 28,
            border: "1px solid var(--line)",
            borderRadius: 18,
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24 }}>
            Your setup is still intact.
          </h1>
          <p style={{ color: "var(--text-2)", lineHeight: 1.6 }}>
            We couldn’t reconnect to your private workspace. No file was
            changed.
          </p>
          <Link href="/onboarding">Try again</Link>
        </section>
      </main>
    );
  }

  if (state.status === "complete") redirect("/today");
  return <OnboardingWorkspace initialState={state} />;
}
