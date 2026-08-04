import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UnavailableState } from "@/src/features/management/unavailable-state";
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
      <main className="grid min-h-svh place-items-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <UnavailableState
            title="Your setup is still intact."
            description="We couldn't reconnect to your private workspace. No file was changed."
            actionHref="/onboarding"
          />
        </div>
      </main>
    );
  }

  if (state.status === "complete") redirect("/today");
  return <OnboardingWorkspace initialState={state} />;
}
