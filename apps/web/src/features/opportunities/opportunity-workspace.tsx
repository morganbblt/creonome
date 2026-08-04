"use client";

import {
  OpportunityFeedbackResultSchema,
  OpportunityRevisionSchema,
  UpgradeOpportunityResultSchema,
  type OpportunityDetail,
  type OpportunityFeedbackAction,
  type OpportunityMemoryScope,
  type ScriptDraft,
} from "@creonome/contracts";
import { ArrowLeftIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import { GenerationToast } from "../generation/generation-toast";
import { publishCreditBalance } from "../navigation/credit-balance";
import { splitScriptSegments } from "../projects/script-segments";

type Panel = "modify" | "upgrade" | null;

const quickPrompts = [
  "Make the opening quieter",
  "Keep it to one take",
  "Make it easier to shoot",
] as const;

const badgeByStrategy = {
  signature: "Natural fit",
  stretch: "Emerging",
  repeatable: "Cross-sector",
} as const;

const maturityLevels = ["idea", "script", "storyboard", "video"] as const;

const feedbackActions: Array<{
  action: OpportunityFeedbackAction;
  label: string;
}> = [
  { action: "this_is_me", label: "That’s me" },
  { action: "almost", label: "Almost" },
  { action: "not_my_style", label: "Not my style" },
  {
    action: "good_idea_bad_wording",
    label: "Good idea, wrong wording",
  },
  { action: "never_use", label: "Never use" },
  { action: "always_do", label: "Always do" },
];

function verdict(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 78) return "Worth a bet";
  return "Experiment";
}

function idempotencyKey(opportunityId: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `script-${opportunityId}-${suffix}`;
}

function scriptErrorMessage(status: number): string {
  if (status === 404) {
    return "This opportunity is no longer available. Return to Today and choose a current idea. No credits were charged.";
  }
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before generating the script. No credits were charged.";
  }
  if (status === 402 || status === 409) {
    return "There are not enough available credits for this script. No credits were charged.";
  }
  if (status === 429) {
    return "Script generation is busy right now. Try again in a moment. No credits were charged.";
  }
  return "The script request could not be confirmed. Your idea is intact; retry to safely resume the same request.";
}

function modificationErrorMessage(status: number): string {
  if (status === 404) {
    return "This opportunity is no longer available. Return to Today and choose a current idea.";
  }
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before applying this change.";
  }
  if (status === 400 || status === 422) {
    return "That change could not be validated. Rephrase it with one clear instruction.";
  }
  if (status === 409) {
    return "This idea changed in another session. Reload it before applying a new change.";
  }
  if (status === 429 || status === 503) {
    return "Creative revision is temporarily unavailable. Your original idea is intact; try again in a moment.";
  }
  return "Creative revision is temporarily unavailable. Your original idea is intact; try again in a moment.";
}

export function OpportunityWorkspace({
  opportunity: initialOpportunity,
  initialPanel = null,
}: {
  opportunity: OpportunityDetail;
  initialPanel?: Panel;
}) {
  const [opportunity, setOpportunity] = useState(initialOpportunity);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [instruction, setInstruction] = useState("");
  const [memoryScope, setMemoryScope] =
    useState<OpportunityMemoryScope>("idea");
  const [keepDuration, setKeepDuration] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptDraft | null>(null);
  const [activeDeliverable, setActiveDeliverable] = useState<"idea" | "script">(
    "idea",
  );
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [generationState, setGenerationState] = useState<
    "pending" | "success" | "error" | null
  >(null);
  const [feedbackPending, setFeedbackPending] =
    useState<OpportunityFeedbackAction | null>(null);
  const [selectedFeedback, setSelectedFeedback] =
    useState<OpportunityFeedbackAction | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackMemoryReady, setFeedbackMemoryReady] = useState(false);
  const scriptRequestKey = useRef<string | null>(null);

  async function submitFeedback(action: OpportunityFeedbackAction) {
    setFeedbackPending(action);
    setFeedbackError(null);
    setFeedbackNotice(null);
    setFeedbackMemoryReady(false);
    try {
      const response = await fetch(
        `/api/creonome/opportunities/${opportunity.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        setFeedbackError(
          response.status === 401 || response.status === 403
            ? "Your session expired. Sign in again before saving feedback."
            : "Feedback could not be saved. Nothing was changed.",
        );
        return;
      }

      const payload = await response.json().catch(() => null);
      const parsedFeedback = OpportunityFeedbackResultSchema.safeParse(payload);
      setSelectedFeedback(action);
      if (!parsedFeedback.success) {
        setFeedbackNotice(
          "Feedback saved. Reload to confirm how it was added to your profile.",
        );
        return;
      }
      const hasMemoryCandidate = parsedFeedback.data.memoryCandidate !== null;
      setFeedbackMemoryReady(hasMemoryCandidate);
      setFeedbackNotice(
        hasMemoryCandidate
          ? "Feedback saved. A Creator DNA memory suggestion is ready for review."
          : "Feedback saved. This signal will tune future opportunities.",
      );
    } catch {
      setFeedbackError(
        "Feedback could not be confirmed. Reload before sending it again.",
      );
    } finally {
      setFeedbackPending(null);
    }
  }

  async function applyChange() {
    if (instruction.trim().length < 3) {
      setError("Describe the change in a few words first.");
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/creonome/opportunities/${opportunity.id}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            memoryScope,
            lockedFields: keepDuration ? ["duration"] : [],
          }),
        },
      );
      if (!response.ok) {
        setError(modificationErrorMessage(response.status));
        return;
      }
      const payload = await response.json().catch(() => null);
      const parsedRevision = OpportunityRevisionSchema.safeParse(payload);
      if (!parsedRevision.success) {
        setNotice(
          "The change was saved, but this page could not refresh it. Reload to see the latest version.",
        );
        setPanel(null);
        return;
      }
      const revision = parsedRevision.data;
      setOpportunity((current) => ({
        ...current,
        title: revision.title,
        pitch: revision.pitch,
        hook: revision.hook,
        currentLevel: revision.project.currentLevel,
        projectId: revision.project.id,
      }));
      setNotice(
        revision.memoryCandidate
          ? "Change applied. A memory suggestion awaits approval."
          : `Change applied as version ${revision.version}.`,
      );
      setPanel(null);
    } catch {
      setError(
        "The change could not be confirmed. Reload before retrying so you do not create a duplicate revision.",
      );
    } finally {
      setPending(false);
    }
  }

  async function generateScript() {
    setPending(true);
    setError(null);
    setGenerationState("pending");
    setPanel(null);
    scriptRequestKey.current ??= idempotencyKey(opportunity.id);
    try {
      const response = await fetch(
        `/api/creonome/opportunities/${opportunity.id}/upgrade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": scriptRequestKey.current,
          },
          body: JSON.stringify({
            targetLevel: "script",
            confirmedCreditCost: true,
          }),
        },
      );
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          retryMode?: string;
        } | null;
        if (failure?.retryMode === "new_request") {
          scriptRequestKey.current = null;
          setError(
            "The reserved credits were released. Your idea is intact; start a fresh request to try again.",
          );
        } else {
          setError(scriptErrorMessage(response.status));
        }
        setGenerationState("error");
        return;
      }
      const upgrade = UpgradeOpportunityResultSchema.parse(
        await response.json(),
      );
      setScript(upgrade.script);
      setActiveDeliverable("script");
      setOpportunity((current) => ({
        ...current,
        currentLevel: upgrade.project.currentLevel,
        projectId: upgrade.project.id,
      }));
      setRemainingCredits(upgrade.credits.available);
      publishCreditBalance(upgrade.credits.available);
      setNotice(
        "Script generated. The idea remains available in version history.",
      );
      setGenerationState("success");
      scriptRequestKey.current = null;
      setPanel(null);
    } catch {
      setError(
        "The script response could not be verified. Your idea is intact; retry to safely resume the same request.",
      );
      setGenerationState("error");
    } finally {
      setPending(false);
    }
  }

  const currentIndex = maturityLevels.indexOf(opportunity.currentLevel);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5.5 pt-7 pb-16 max-[620px]:px-3.5 max-[620px]:pt-5.5 max-[620px]:pb-12">
      <Link
        href="/today"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Back to Today
      </Link>

      {script ? (
        <div
          className="mb-5 inline-flex h-11 w-fit items-center gap-1 rounded-control bg-secondary p-1"
          role="tablist"
          aria-label="Deliverables"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeDeliverable === "script"}
            onClick={() => setActiveDeliverable("script")}
            className={cn(
              "inline-flex h-full items-center rounded-[calc(var(--radius-control)-4px)] px-3.5 text-sm font-medium transition-colors",
              activeDeliverable === "script"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Script
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDeliverable === "idea"}
            onClick={() => setActiveDeliverable("idea")}
            className={cn(
              "inline-flex h-full items-center rounded-[calc(var(--radius-control)-4px)] px-3.5 text-sm font-medium transition-colors",
              activeDeliverable === "idea"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Idea
          </button>
        </div>
      ) : null}

      {activeDeliverable === "idea" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-7 max-[900px]:grid-cols-1">
          <section
            className="flex min-w-0 flex-col gap-6"
            aria-label="Opportunity detail"
          >
            <header>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge className="border-transparent bg-accent-soft text-accent-soft-foreground">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {badgeByStrategy[opportunity.strategy]}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {opportunity.estimatedDurationSeconds ?? 35}s · 9:16 ·{" "}
                  {opportunity.effort} effort
                </span>
              </div>
              <h1 className="m-0 text-[34px] leading-[1.08] font-semibold tracking-[-0.03em] text-foreground text-balance max-[620px]:text-[26px]">
                {opportunity.title}
              </h1>
              <p className="mt-2.5 text-[15px] leading-[1.5] text-muted-foreground">
                {opportunity.pitch}
              </p>
            </header>

            <div
              className="relative grid aspect-[9/16] w-[min(100%,286px)] place-items-center overflow-hidden rounded-card border border-border bg-gradient-to-br from-secondary via-secondary to-muted-foreground/20 shadow-lg"
              role="img"
              aria-label={`Vertical 9:16 preview for ${opportunity.title}`}
            >
              <span className="absolute top-4 left-4 rounded-full bg-background/85 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-foreground backdrop-blur-sm uppercase">
                9:16
              </span>
              <span className="grid size-14 place-items-center rounded-full bg-foreground/90 text-background shadow-lg">
                <PlayIcon aria-hidden="true" className="size-6 translate-x-0.5 fill-background" />
              </span>
            </div>

            <section className="flex flex-col gap-4" aria-label="Creative reasoning">
              <div className="border-l-2 border-accent pl-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  HOOK
                </span>
                <p className="mt-1 text-sm leading-[1.5] text-foreground">
                  {opportunity.hook}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 rounded-card border border-border bg-card p-4">
                <strong className="font-mono text-2xl leading-none font-semibold tracking-[-0.02em]">
                  {opportunity.score}
                </strong>
                <span className="font-mono text-xs text-muted-foreground">
                  /100
                </span>
                <em className="rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold not-italic">
                  {verdict(opportunity.score)}
                </em>
                <small className="ml-auto font-mono text-xs text-muted-foreground">
                  {opportunity.confidence} confidence
                </small>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                  Why this fits
                </span>
                <div
                  className="rounded-card border border-border bg-card p-4"
                  data-status={opportunity.trendSignal.status}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                        Trend signal
                      </span>
                      <strong className="block text-sm font-semibold text-foreground">
                        {opportunity.trendSignal.title ?? "Signal unavailable"}
                      </strong>
                    </div>
                    {opportunity.trendSignal.momentumScore !== null ? (
                      <div className="text-right">
                        <strong className="font-mono text-lg font-semibold">
                          {opportunity.trendSignal.momentumScore}
                        </strong>
                        <span className="block font-mono text-[10px] text-muted-foreground">
                          /100 momentum
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {opportunity.trendSignal.status === "unavailable"
                      ? opportunity.trendSignal.reason
                      : `${opportunity.trendSignal.lifecycle} · ${opportunity.trendSignal.evidenceCount} normalized references${
                          opportunity.trendSignal.source === "sample"
                            ? " · sample data"
                            : ""
                        }`}
                  </p>
                </div>
                <p className="text-sm leading-[1.55] text-foreground">
                  {opportunity.rationale}
                </p>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {opportunity.evidence.map((item) => (
                    <li
                      key={item}
                      className="text-[13px] leading-[1.5] text-muted-foreground before:mr-2 before:content-['—']"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {opportunity.reserve ? (
                  <p className="text-[13px] leading-[1.5] text-muted-foreground">
                    <strong className="text-foreground">Reserve —</strong>{" "}
                    {opportunity.reserve}
                  </p>
                ) : null}
              </div>
            </section>

            <section
              className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
              aria-label="Creative feedback"
            >
              <div>
                <p className="m-0 text-sm font-semibold text-foreground">
                  Does this feel like you?
                </p>
                <span className="text-xs text-muted-foreground">
                  Explicit feedback improves the next three routes.
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {feedbackActions.map(({ action, label }) => (
                  <button
                    type="button"
                    aria-pressed={selectedFeedback === action}
                    disabled={feedbackPending !== null}
                    key={action}
                    onClick={() => void submitFeedback(action)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      selectedFeedback === action
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-input text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {feedbackPending === action ? "Saving…" : label}
                  </button>
                ))}
              </div>
              {feedbackNotice ? (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {feedbackNotice}{" "}
                  {feedbackMemoryReady ? (
                    <Link href="/creator-dna" className="font-semibold text-accent hover:underline">
                      Review memory →
                    </Link>
                  ) : null}
                </p>
              ) : null}
              {feedbackError ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {feedbackError}
                </p>
              ) : null}
            </section>

            {notice ? (
              <p className="rounded-control border border-border bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground">
                {notice}
              </p>
            ) : null}
            {error && !panel && !generationState ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2.5">
              {opportunity.currentLevel === "idea" ? (
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setGenerationState(null);
                    setPanel("upgrade");
                  }}
                >
                  Move to script{" "}
                  <span className="font-mono text-xs opacity-70">
                    {opportunity.creditCost} cr
                  </span>
                </Button>
              ) : (
                <Button type="button" variant="outline" asChild>
                  <Link
                    href={
                      opportunity.projectId
                        ? `/projects/${opportunity.projectId}`
                        : "/projects"
                    }
                  >
                    Continue in Projects
                  </Link>
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setPanel("modify")}>
                Modify idea
              </Button>
            </div>
          </section>

          <aside
            className="sticky top-35 flex flex-col gap-3 max-[900px]:static max-[900px]:grid max-[900px]:grid-cols-2"
            aria-label="Project maturity"
          >
            <p className="col-span-full m-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              Project path
            </p>
            {maturityLevels.map((level, index) => {
              const label = level[0]!.toUpperCase() + level.slice(1);
              const active = index === currentIndex;
              const complete = index < currentIndex;
              return (
                <div
                  key={level}
                  className={cn(
                    "flex items-center gap-2.5 rounded-control border px-3 py-2.5",
                    active
                      ? "border-accent bg-accent-soft"
                      : complete
                        ? "border-border bg-card"
                        : "border-dashed border-border bg-card/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="leading-tight">
                    <strong
                      className={cn(
                        "block text-[13px] font-semibold",
                        active ? "text-accent-soft-foreground" : "text-foreground",
                      )}
                    >
                      {label}
                    </strong>
                    <small className="text-[11px] text-muted-foreground">
                      {active
                        ? "Current level"
                        : complete
                          ? "Complete"
                          : "Not generated yet"}
                    </small>
                  </div>
                </div>
              );
            })}
          </aside>
        </div>
      ) : null}

      {script && activeDeliverable === "script" ? (
        <section className="flex flex-col gap-4" aria-live="polite">
          <div>
            <p className="m-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              Script · Version 1
            </p>
            <h2 className="m-0 mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
              Your script
            </h2>
          </div>
          <blockquote className="m-0 rounded-card border-l-2 border-accent bg-card px-4 py-3.5 text-[15px] leading-[1.5] font-medium text-foreground italic">
            {script.hook}
          </blockquote>
          <div
            className="flex flex-col gap-2.5 rounded-card border border-border bg-card p-4"
            aria-label="Script timeline"
          >
            {splitScriptSegments(script.body).map((segment, index) => (
              <p
                data-testid="script-segment"
                key={`${index}-${segment}`}
                className="m-0 text-sm leading-[1.55] text-foreground"
              >
                {segment}
              </p>
            ))}
          </div>
          {script.callToAction ? (
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">CTA</strong>{" "}
              {script.callToAction}
            </p>
          ) : null}
          <footer className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="font-mono text-xs text-muted-foreground">
              {remainingCredits} credits remaining
            </span>
            <Link
              href={
                opportunity.projectId
                  ? `/projects/${opportunity.projectId}`
                  : "/projects"
              }
              className="text-sm font-semibold text-accent hover:underline"
            >
              View project →
            </Link>
          </footer>
        </section>
      ) : null}

      <Sheet
        open={panel === "modify"}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <SheetContent
          overlayClassName="bg-transparent backdrop-blur-none"
          className="border-l-border/70 bg-card/82 shadow-[-24px_0_70px_-20px_rgb(0_0_0/0.18)] backdrop-blur-lg backdrop-saturate-125"
        >
          <SheetHeader>
            <p className="m-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              Creative chat
            </p>
            <SheetTitle>Modify this idea</SheetTitle>
            <SheetDescription>
              Describe one change. The current idea stays in version history.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-6">
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => setInstruction(prompt)}
                  className="rounded-full border border-input px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Describe the change
              <Textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Make the hook quieter, but keep it one take…"
                rows={4}
              />
            </label>
            <fieldset className="flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 text-xs font-semibold text-muted-foreground">
                Remember this preference
              </legend>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "idea"}
                  onChange={() => setMemoryScope("idea")}
                  className="size-4 accent-accent"
                />
                Only for this idea
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "project"}
                  onChange={() => setMemoryScope("project")}
                  className="size-4 accent-accent"
                />
                Remember for this project
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "creator"}
                  onChange={() => setMemoryScope("creator")}
                  className="size-4 accent-accent"
                />
                Suggest for Creator DNA
              </label>
            </fieldset>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={keepDuration}
                onChange={(event) => setKeepDuration(event.target.checked)}
                className="size-4 accent-accent"
              />
              Lock the current duration
            </label>
            {error ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            <Button type="button" disabled={pending} onClick={applyChange}>
              {pending ? "Applying…" : "Apply change"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={panel === "upgrade"}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <span className="w-fit rounded-full bg-accent-soft px-3 py-1.5 font-mono text-xs font-semibold text-accent-soft-foreground">
            {opportunity.creditCost} cr
          </span>
          <p className="m-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
            Next level
          </p>
          <DialogTitle>Generate the script?</DialogTitle>
          <DialogDescription>
            Creonome will turn this idea into a shootable script. This costs{" "}
            <strong className="text-foreground">
              {opportunity.creditCost} credits
            </strong>
            . Failed generations are refunded automatically.
          </DialogDescription>
          {error ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPanel(null)}>
              Not now
            </Button>
            <Button type="button" disabled={pending} onClick={generateScript}>
              {pending
                ? "Generating…"
                : `Generate script · ${opportunity.creditCost} credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {generationState ? (
        <div className="fixed right-5 bottom-5 z-50">
          <GenerationToast
            state={generationState}
            title={
              generationState === "pending"
                ? "Building your script"
                : generationState === "success"
                  ? "Script ready"
                  : "Script not generated"
            }
            detail={
              generationState === "pending"
                ? "Writing the hook, timeline, caption and call to action."
                : generationState === "success"
                  ? "The script is saved to this project. Your idea remains in history."
                  : (error ??
                    "The request stopped safely. No duplicate was created.")
            }
            creditLabel={
              generationState === "pending"
                ? `${opportunity.creditCost} credits held`
                : undefined
            }
            onDismiss={
              generationState === "pending"
                ? undefined
                : () => {
                    setGenerationState(null);
                    setError(null);
                  }
            }
          />
        </div>
      ) : null}
    </main>
  );
}
