"use client";

import {
  RegenerateScriptBlockResultSchema,
  SCRIPT_BLOCK_FIELDS,
  type ScriptBlockField,
  type ScriptDraft,
} from "@creonome/contracts";
import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Textarea } from "@/src/components/ui/textarea";
import { GenerationToast } from "../generation/generation-toast";
import { splitScriptSegments } from "./script-segments";

/**
 * Average spoken pace used to keep the duration counter "live" (bible
 * §15.3) — recalculated from the current hook/body/CTA word count on every
 * render instead of only showing the (potentially stale) persisted
 * `durationSeconds`. 2.5 words/sec is a common estimate for a delivered
 * short-form voiceover; it's an estimate, not a claim of precision, so the
 * UI always labels it "~".
 */
const WORDS_PER_SECOND = 2.5;

function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_SECOND);
}

const fieldLabels: Record<ScriptBlockField, string> = {
  hook: "Hook",
  body: "Body",
  callToAction: "CTA",
  caption: "Caption",
};

function blockFieldErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before editing the script.";
  }
  if (status === 404) {
    return "This project no longer has a script to edit. Reload the project.";
  }
  if (status === 422) {
    return "The AI could not honor a locked block, or the rewrite didn't pass the quality check. Nothing was changed.";
  }
  return "The script could not be updated. Try again.";
}

export function ScriptEditor({
  projectId,
  script,
}: {
  projectId: string;
  script: ScriptDraft;
}) {
  const router = useRouter();
  const [openField, setOpenField] = useState<ScriptBlockField | null>(null);
  const [passage, setPassage] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [lockedFields, setLockedFields] = useState<Set<ScriptBlockField>>(
    () => new Set(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bodySegments = useMemo(
    () => splitScriptSegments(script.body),
    [script.body],
  );
  const estimatedSeconds = useMemo(
    () =>
      estimateSeconds(
        [script.hook, script.body, script.callToAction ?? ""].join(" "),
      ),
    [script.hook, script.body, script.callToAction],
  );

  function openEditor(field: ScriptBlockField, selectedPassage?: string) {
    setOpenField(field);
    setPassage(selectedPassage ?? null);
    setInstruction("");
    setLockedFields(new Set());
    setError(null);
  }

  function toggleLock(field: ScriptBlockField, checked: boolean) {
    setLockedFields((current) => {
      const next = new Set(current);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  async function submit() {
    if (!openField || instruction.trim().length < 3) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/projects/${projectId}/script`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: openField,
            instruction: instruction.trim(),
            lockedFields: [...lockedFields],
          }),
        },
      );
      if (!response.ok) {
        setError(blockFieldErrorMessage(response.status));
        return;
      }
      RegenerateScriptBlockResultSchema.parse(await response.json());
      setOpenField(null);
      setSuccess(true);
      router.refresh();
    } catch {
      setError("The script could not be updated. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-0 overflow-hidden p-0" aria-labelledby="script-title">
      <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="m-0 mb-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
            Script · latest
          </p>
          <h2
            id="script-title"
            className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground"
          >
            {script.title}
          </h2>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground uppercase">
          ~{estimatedSeconds}s estimated
          {script.durationSeconds !== null
            ? ` · ${script.durationSeconds}s saved`
            : ""}{" "}
          · {script.platforms.join(" / ")}
        </span>
      </div>
      <div className="p-6 max-[620px]:p-3.5">
        <div className="group relative rounded-[6px] border-l-[3px] border-foreground bg-secondary/60 p-5 max-[620px]:p-4">
          <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
            HOOK · 00:00
          </span>
          <blockquote className="m-0 mt-3 text-2xl leading-[1.2] font-semibold tracking-[-0.02em] text-foreground">
            {script.hook}
          </blockquote>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => openEditor("hook", script.hook)}
          >
            <SparklesIcon className="size-3.5" aria-hidden="true" />
            Ask AI to change this
          </Button>
        </div>
        <div className="border-b border-border py-7 max-[620px]:py-5">
          <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
            BODY
          </span>
          {bodySegments.map((segment, index) => (
            <div
              data-testid="script-block"
              key={`${index}-${segment}`}
              className="group mt-3 max-w-[680px]"
            >
              <p className="m-0 text-[15px] leading-[1.75] whitespace-pre-wrap text-foreground">
                {segment}
              </p>
              <button
                type="button"
                className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9.5px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => openEditor("body", segment)}
              >
                <SparklesIcon className="size-3" aria-hidden="true" />
                Ask AI to change this passage
              </button>
            </div>
          ))}
        </div>
        {script.callToAction ? (
          <div className="group grid grid-cols-[70px_1fr] gap-4 border-b border-border py-4.5">
            <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
              CTA
            </span>
            <div>
              <p className="m-0 text-[12.5px] leading-[1.55] text-muted-foreground">
                {script.callToAction}
              </p>
              <button
                type="button"
                className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9.5px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => openEditor("callToAction", script.callToAction!)}
              >
                <SparklesIcon className="size-3" aria-hidden="true" />
                Ask AI to change this
              </button>
            </div>
          </div>
        ) : null}
        {script.caption ? (
          <div className="group grid grid-cols-[70px_1fr] gap-4 py-4.5">
            <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
              CAPTION
            </span>
            <div>
              <p className="m-0 text-[12.5px] leading-[1.55] text-muted-foreground">
                {script.caption}
              </p>
              <button
                type="button"
                className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9.5px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => openEditor("caption", script.caption!)}
              >
                <SparklesIcon className="size-3" aria-hidden="true" />
                Ask AI to change this
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={openField !== null}
        onOpenChange={(next) => {
          if (!next) setOpenField(null);
        }}
      >
        <DialogContent aria-label="Edit script block">
          <DialogHeader>
            <DialogTitle>
              Change the {openField ? fieldLabels[openField] : ""} block
            </DialogTitle>
            <DialogDescription>
              {passage
                ? `Currently: "${passage.length > 140 ? `${passage.slice(0, 140)}…` : passage}"`
                : "Describe the change you want."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Requested change"
            placeholder="e.g. Make this punchier and cut it to one sentence."
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="m-0 font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
              Lock the other blocks to keep them unchanged
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SCRIPT_BLOCK_FIELDS.filter((field) => field !== openField).map(
                (field) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 text-[12px] text-foreground"
                  >
                    <Checkbox
                      checked={lockedFields.has(field)}
                      onCheckedChange={(checked) =>
                        toggleLock(field, checked === true)
                      }
                    />
                    {fieldLabels[field]}
                  </label>
                ),
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenField(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || instruction.trim().length < 3}
            >
              {pending ? "Rewriting…" : "Regenerate this block"}
            </Button>
          </DialogFooter>
          {error ? (
            <p role="alert" className="m-0 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      {success ? (
        <div className="px-6 pb-5 max-[620px]:px-3.5">
          <GenerationToast
            state="success"
            title="Script block updated"
            detail="The regenerated block is saved to this project."
            onDismiss={() => setSuccess(false)}
          />
        </div>
      ) : null}
    </Card>
  );
}
