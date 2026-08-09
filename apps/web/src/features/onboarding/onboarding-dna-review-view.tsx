"use client";

import type { CreatorDna, CreatorDnaTrait } from "@creonome/contracts";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";

function categoryLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Same bible §11.1 four-layer badge treatment as
 * creator-dna-view.tsx's layerCopy -- this view is a read-only preview of
 * the same data shown right after onboarding confirms it, so the labels
 * must stay identical to avoid teaching the creator two different
 * vocabularies for the same concept.
 */
const layerCopy: Record<
  CreatorDnaTrait["layer"],
  { label: string; variant: "outline" | "default" | "accent" | "destructive" }
> = {
  declared: { label: "Declared", variant: "outline" },
  observed: { label: "Observed", variant: "default" },
  learned: { label: "Learned", variant: "accent" },
  forbidden: { label: "Forbidden", variant: "destructive" },
};

export function OnboardingDnaReviewView({
  dna,
  loading,
  error,
  onBack,
  onContinue,
}: {
  dna: CreatorDna | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6 px-6 py-8 sm:px-8 sm:py-10">
      <div className="max-w-xl space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your Creator DNA
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Here is what we captured.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every trait shows how confident we are and where it came from. Nothing
          here is final — refine it any time from Creator DNA.
        </p>
      </div>

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <Loader2Icon className="size-4 animate-spin text-accent" />
          Loading your Creator DNA…
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {dna ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <p className="text-lg leading-snug font-medium tracking-tight text-foreground">
                {dna.summary}
              </p>
              <span className="text-xs text-muted-foreground">
                {dna.traits.length} evidence-backed traits
              </span>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dna.traits.map((trait) => {
              const layer = layerCopy[trait.layer];
              const confidence =
                trait.confidence === null
                  ? null
                  : Math.round(trait.confidence * 100);
              return (
                <Card
                  className={
                    trait.layer === "forbidden"
                      ? "border-destructive/30"
                      : undefined
                  }
                  key={trait.id}
                >
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {categoryLabel(trait.category)}
                      </Badge>
                      <Badge variant={layer.variant}>{layer.label}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {trait.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {trait.value}
                    </p>
                    <Progress className="h-1" value={confidence ?? 0} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {confidence === null
                        ? "Unscored"
                        : `${confidence}% confidence`}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground sm:flex-1">
          Declared and observed traits reflect what you gave us. Learned and
          forbidden traits grow as you use Creonome.
        </span>
        <div className="flex gap-2.5">
          <Button onClick={onBack} type="button" variant="outline">
            Back
          </Button>
          <Button disabled={loading || !dna} onClick={onContinue} type="button">
            Continue
          </Button>
        </div>
      </footer>
    </div>
  );
}
