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
import Link from "next/link";
import { useRef, useState } from "react";
import { GenerationToast } from "../generation/generation-toast";
import { publishCreditBalance } from "../navigation/credit-balance";
import { splitScriptSegments } from "../projects/script-segments";
import styles from "./opportunity-workspace.module.css";

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

  return (
    <main className={styles.page}>
      <Link href="/today" className={styles.back}>
        ← Back to Today
      </Link>

      {script ? (
        <div
          className={styles.deliverableTabs}
          role="tablist"
          aria-label="Deliverables"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeDeliverable === "script"}
            onClick={() => setActiveDeliverable("script")}
          >
            Script
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDeliverable === "idea"}
            onClick={() => setActiveDeliverable("idea")}
          >
            Idea
          </button>
        </div>
      ) : null}

      {activeDeliverable === "idea" ? (
        <div className={styles.layout}>
          <section className={styles.idea} aria-label="Opportunity detail">
            <header className={styles.hero}>
              <div className={styles.heroMeta}>
                <span
                  className={`${styles.badge} ${styles[opportunity.strategy]}`}
                >
                  <span aria-hidden="true" />
                  {badgeByStrategy[opportunity.strategy]}
                </span>
                <span>
                  {opportunity.estimatedDurationSeconds ?? 35}s · 9:16 ·{" "}
                  {opportunity.effort} effort
                </span>
              </div>
              <h1>{opportunity.title}</h1>
              <p>{opportunity.pitch}</p>
            </header>

            <div
              className={styles.media}
              role="img"
              aria-label={`Vertical frame concept for ${opportunity.title}`}
            >
              <span className={styles.mediaLabel}>CREATOR FOOTAGE · 9:16</span>
              <span className={styles.subject} />
              <span className={styles.play} aria-hidden="true">
                ▶
              </span>
            </div>

            <section className={styles.readout} aria-label="Creative reasoning">
              <div className={styles.hook}>
                <span>HOOK</span>
                <p>{opportunity.hook}</p>
              </div>
              <div className={styles.score}>
                <strong>{opportunity.score}</strong>
                <span>/100</span>
                <em>{verdict(opportunity.score)}</em>
                <small>{opportunity.confidence} confidence</small>
              </div>
              <div className={styles.why}>
                <span>WHY THIS FITS</span>
                <p>{opportunity.rationale}</p>
                <ul>
                  {opportunity.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {opportunity.reserve ? (
                  <p className={styles.reserve}>
                    <strong>Reserve —</strong> {opportunity.reserve}
                  </p>
                ) : null}
              </div>
            </section>

            <section className={styles.feedback} aria-label="Creative feedback">
              <div>
                <p>Does this feel like you?</p>
                <span>Explicit feedback improves the next three routes.</span>
              </div>
              <div className={styles.feedbackActions}>
                {feedbackActions.map(({ action, label }) => (
                  <button
                    type="button"
                    aria-pressed={selectedFeedback === action}
                    disabled={feedbackPending !== null}
                    key={action}
                    onClick={() => void submitFeedback(action)}
                  >
                    {feedbackPending === action ? "Saving…" : label}
                  </button>
                ))}
              </div>
              {feedbackNotice ? (
                <p className={styles.feedbackStatus} aria-live="polite">
                  {feedbackNotice}{" "}
                  {feedbackMemoryReady ? (
                    <Link href="/creator-dna">Review memory →</Link>
                  ) : null}
                </p>
              ) : null}
              {feedbackError ? (
                <p className={styles.feedbackError} role="alert">
                  {feedbackError}
                </p>
              ) : null}
            </section>

            {notice ? <p className={styles.notice}>{notice}</p> : null}
            {error && !panel && !generationState ? (
              <p className={styles.error}>{error}</p>
            ) : null}

            <div className={styles.actions}>
              {opportunity.currentLevel === "idea" ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setGenerationState(null);
                    setPanel("upgrade");
                  }}
                >
                  Move to script <span>{opportunity.creditCost} cr</span>
                </button>
              ) : (
                <Link
                  href={
                    opportunity.projectId
                      ? `/projects/${opportunity.projectId}`
                      : "/projects"
                  }
                  className={styles.continueProject}
                >
                  Continue in Projects
                </Link>
              )}
              <button type="button" onClick={() => setPanel("modify")}>
                Modify idea
              </button>
            </div>
          </section>

          <aside className={styles.progress} aria-label="Project maturity">
            <p>PROJECT PATH</p>
            {maturityLevels.map((level, index) => {
              const currentIndex = maturityLevels.indexOf(
                opportunity.currentLevel,
              );
              const label = level[0]!.toUpperCase() + level.slice(1);
              return (
                <div
                  className={
                    index === currentIndex
                      ? styles.activeLevel
                      : index < currentIndex
                        ? styles.completedLevel
                        : styles.level
                  }
                  key={level}
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {index === currentIndex
                        ? "Current level"
                        : index < currentIndex
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
        <section className={styles.script} aria-live="polite">
          <div>
            <p>SCRIPT · VERSION 1</p>
            <h2>Your script</h2>
          </div>
          <blockquote>{script.hook}</blockquote>
          <div className={styles.scriptTimeline} aria-label="Script timeline">
            {splitScriptSegments(script.body).map((segment, index) => (
              <p data-testid="script-segment" key={`${index}-${segment}`}>
                {segment}
              </p>
            ))}
          </div>
          {script.callToAction ? (
            <p>
              <strong>CTA</strong> {script.callToAction}
            </p>
          ) : null}
          <footer>
            <span>{remainingCredits} credits remaining</span>
            <Link
              href={
                opportunity.projectId
                  ? `/projects/${opportunity.projectId}`
                  : "/projects"
              }
            >
              View project →
            </Link>
          </footer>
        </section>
      ) : null}

      {panel === "modify" ? (
        <div className={styles.overlay}>
          <aside
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modify-title"
          >
            <header>
              <div>
                <p>CREATIVE CHAT</p>
                <h2 id="modify-title">Modify this idea</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPanel(null)}
              >
                ×
              </button>
            </header>
            <p>
              Describe one change. The current idea stays in version history.
            </p>
            <div className={styles.prompts}>
              {quickPrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => setInstruction(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <label className={styles.textareaLabel}>
              Describe the change
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Make the hook quieter, but keep it one take…"
              />
            </label>
            <fieldset className={styles.scope}>
              <legend>Remember this preference</legend>
              <label>
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "idea"}
                  onChange={() => setMemoryScope("idea")}
                />
                Only for this idea
              </label>
              <label>
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "project"}
                  onChange={() => setMemoryScope("project")}
                />
                Remember for this project
              </label>
              <label>
                <input
                  type="radio"
                  name="memory-scope"
                  checked={memoryScope === "creator"}
                  onChange={() => setMemoryScope("creator")}
                />
                Suggest for Creator DNA
              </label>
            </fieldset>
            <label className={styles.lock}>
              <input
                type="checkbox"
                checked={keepDuration}
                onChange={(event) => setKeepDuration(event.target.checked)}
              />
              Lock the current duration
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button
              className={styles.submit}
              type="button"
              disabled={pending}
              onClick={applyChange}
            >
              {pending ? "Applying…" : "Apply change"}
            </button>
          </aside>
        </div>
      ) : null}

      {panel === "upgrade" ? (
        <div className={styles.overlay}>
          <section
            className={styles.confirm}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
          >
            <span className={styles.cost}>{opportunity.creditCost} cr</span>
            <p>NEXT LEVEL</p>
            <h2 id="upgrade-title">Generate the script?</h2>
            <p>
              Creonome will turn this idea into a shootable script. This costs{" "}
              <strong>{opportunity.creditCost} credits</strong>. Failed
              generations are refunded automatically.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div>
              <button type="button" onClick={() => setPanel(null)}>
                Not now
              </button>
              <button type="button" disabled={pending} onClick={generateScript}>
                {pending
                  ? "Generating…"
                  : `Generate script · ${opportunity.creditCost} credits`}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {generationState ? (
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
      ) : null}
    </main>
  );
}
