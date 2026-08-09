"use client";

import type {
  OnboardingCalibrationConcept,
  OnboardingCalibrationResponseValue,
} from "@creonome/contracts";
import {
  CheckIcon,
  CompassIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

/** Bible screen #17: exactly three responses per mini-concept. */
const responseOptions: {
  value: OnboardingCalibrationResponseValue;
  label: string;
  icon: typeof CheckIcon;
}[] = [
  { value: "feels_like_me", label: "Feels like me", icon: CheckIcon },
  { value: "future_direction", label: "A future direction", icon: CompassIcon },
  { value: "not_for_me", label: "Not for me", icon: XIcon },
];

export function OnboardingCalibrationView({
  concepts,
  responses,
  loading,
  error,
  submitting,
  onRespond,
  onBack,
  onContinue,
}: {
  concepts: OnboardingCalibrationConcept[];
  responses: Record<string, OnboardingCalibrationResponseValue>;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  onRespond: (
    conceptId: string,
    response: OnboardingCalibrationResponseValue,
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const answeredCount = concepts.filter(
    (concept) => responses[concept.id],
  ).length;
  const canContinue = concepts.length > 0 && answeredCount === concepts.length;

  return (
    <div className="space-y-6 px-6 py-8 sm:px-8 sm:py-10">
      <div className="max-w-xl space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Calibration
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          React to six quick concepts.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          There are no wrong answers — this sharpens what Creonome generates
          for you next.
        </p>
      </div>

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <Loader2Icon className="size-4 animate-spin text-accent" />
          Generating your calibration concepts…
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {concepts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {concepts.map((concept) => {
            const selected = responses[concept.id];
            return (
              <Card key={concept.id}>
                <CardContent className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {concept.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {concept.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {responseOptions.map(({ value, label, icon: Icon }) => (
                      <Button
                        aria-pressed={selected === value}
                        className={cn(
                          "h-7 rounded-full px-3 text-[11px] font-medium",
                          selected === value &&
                            "border-transparent bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft",
                        )}
                        key={value}
                        onClick={() => onRespond(concept.id, value)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Icon className="size-3.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {answeredCount} of {concepts.length || 6} answered
        </span>
        <div className="flex gap-2.5">
          <Button onClick={onBack} type="button" variant="outline">
            Back
          </Button>
          <Button
            disabled={!canContinue || submitting}
            onClick={onContinue}
            type="button"
          >
            {submitting ? (
              <>
                <Loader2Icon className="animate-spin" /> Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
