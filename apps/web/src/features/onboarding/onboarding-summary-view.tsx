"use client";

import type { CreditsResponse, OnboardingProfile } from "@creonome/contracts";
import { CoinsIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

type SummaryItem = { label: string; value: string };

/**
 * Bible screen #18: 8-12 key traits/objectives at a glance before
 * generation. Built directly from the confirmed onboarding profile
 * (already the source of truth the "declared" Creator DNA traits were
 * written from -- see onboarding-mapping.ts's profileToTraitInputs) rather
 * than re-fetching Creator DNA, since the two are guaranteed to agree right
 * after profile confirmation and the profile is already in hand.
 */
function buildSummaryItems(profile: OnboardingProfile): SummaryItem[] {
  const items: SummaryItem[] = [
    { label: "Stage name", value: profile.stageName },
    { label: "Creative signature", value: profile.creativeSignature },
    { label: "Target audience", value: profile.targetAudience },
    ...profile.disciplines
      .slice(0, 3)
      .map((value) => ({ label: "Discipline", value })),
    ...profile.genres.slice(0, 3).map((value) => ({ label: "Genre", value })),
    ...profile.themes
      .slice(0, 3)
      .map((value) => ({ label: "Objective", value })),
  ];
  return items.slice(0, 12);
}

export function OnboardingSummaryView({
  profile,
  credits,
  generating,
  error,
  onGenerate,
}: {
  profile: OnboardingProfile;
  credits: CreditsResponse | null;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const items = buildSummaryItems(profile);

  return (
    <div className="space-y-6 px-6 py-8 sm:px-8 sm:py-10">
      <div className="max-w-xl space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ready to create
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Here is your Creator DNA at a glance.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          One last look before Creonome generates your first opportunities.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Key traits &amp; objectives
          </h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {items.map((item, index) => (
              <li
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
                key={`${item.label}-${index}`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {profile.boundaries.length ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Limits &amp; counter-references
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.boundaries.map((boundary) => (
                <Badge key={boundary} variant="destructive">
                  {boundary}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CoinsIcon className="size-4 text-muted-foreground" />
            Available credits
          </div>
          <span className="font-mono text-2xl font-semibold text-foreground">
            {credits ? credits.available : "—"}
          </span>
        </CardContent>
      </Card>

      {error ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground sm:flex-1">
          You can refine every dimension later from Creator DNA.
        </span>
        <Button disabled={generating} onClick={onGenerate} type="button">
          {generating ? (
            <>
              <Loader2Icon className="animate-spin" /> Opening your
              workspace…
            </>
          ) : (
            <>
              <SparklesIcon /> Generate my first opportunities
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
