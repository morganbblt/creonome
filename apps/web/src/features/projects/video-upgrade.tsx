"use client";

import {
  CreditsResponseSchema,
  ProjectDetailSchema,
  QueuedGenerationJobSchema,
  UpgradeVideoResultSchema,
  type ProjectVideo,
  type UpgradeVideoResult,
} from "@creonome/contracts";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { GenerationToast } from "../generation/generation-toast";
import { publishCreditBalance } from "../navigation/credit-balance";
import {
  GenerationJobFailedError,
  pollGenerationJob,
} from "../generation/poll-generation-job";

/** Mirrors apps/api/src/modules/projects/locked-fields.ts VIDEO_LOCKABLE_FIELDS. */
const VIDEO_LOCKABLE_FIELDS = [
  ["durationSeconds", "Duration"],
  ["width", "Width"],
  ["height", "Height"],
] as const;

function videoErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before rendering the video. No credits were charged.";
  }
  if (status === 402) {
    return "There are not enough available credits for this video. No credits were charged.";
  }
  if (status === 404) {
    return "This project no longer has an available storyboard. Reload it before rendering a video. No credits were charged.";
  }
  if (status === 409) {
    return "This project changed in another session. Reload it before rendering a video. No credits were charged.";
  }
  if (status === 429 || status === 503) {
    return "Video rendering is temporarily unavailable. Your storyboard is intact and no credits were charged. Try again in a moment.";
  }
  return "The video request could not be confirmed. Your storyboard is intact; retry to safely resume the same request.";
}

function createIdempotencyKey(projectId: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `video-${projectId}-${suffix}`;
}

export function VideoUpgrade({
  projectId,
  video,
}: {
  projectId: string;
  /**
   * The current video, when one already exists. Its presence is what
   * distinguishes a first-time render (nothing to lock yet) from a
   * regeneration of an already-produced level (bible §9.6) — passing it
   * turns on the lock-toggle affordance and switches the button/dialog
   * copy to "regenerate".
   */
  video?: ProjectVideo | null;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<"queued" | "running" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeVideoResult | null>(null);
  const [lockedFieldsState, setLockedFieldsState] = useState<Set<string>>(
    () => new Set(),
  );
  const isRegeneration = Boolean(video);

  function toggleLock(field: string, checked: boolean) {
    setLockedFieldsState((current) => {
      const next = new Set(current);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  async function generateVideo() {
    setOpen(false);
    setPending(true);
    setPhase("running");
    setError(null);
    key.current ??= createIdempotencyKey(projectId);
    const lockedFields = [...lockedFieldsState];

    try {
      const response = await fetch(
        `/api/creonome/projects/${projectId}/upgrade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key.current,
          },
          body: JSON.stringify({
            targetLevel: "video",
            confirmedCreditCost: true,
            ...(lockedFields.length > 0 ? { lockedFields } : {}),
          }),
        },
      );
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          retryMode?: string;
        } | null;
        if (failure?.retryMode === "new_request") {
          key.current = null;
          setError(
            "The reserved credits were released. Your storyboard is intact; start a fresh request to try again.",
          );
        } else {
          setError(videoErrorMessage(response.status));
        }
        return;
      }

      const body = await response.json();
      const queued = QueuedGenerationJobSchema.safeParse(body);
      if (queued.success && queued.data.job.status !== "succeeded") {
        // Video rendering now runs on the Cloud Tasks queue instead of
        // inline (it used to sit dangerously close to the Cloud Run
        // request timeout): poll the job, then load the finished video.
        setPhase("queued");
        const finished = await pollGenerationJob(queued.data.job.id, {
          onUpdate: (job) => {
            if (job.status === "queued" || job.status === "running") {
              setPhase(job.status);
            }
          },
        });
        if (!finished.projectId) {
          throw new Error("The finished job did not report its project");
        }
        const [projectResponse, creditsResponse] = await Promise.all([
          fetch(`/api/creonome/projects/${finished.projectId}`, {
            cache: "no-store",
          }),
          fetch("/api/creonome/credits", { cache: "no-store" }),
        ]);
        if (!projectResponse.ok || !creditsResponse.ok) {
          throw new Error("Could not load the finished video");
        }
        const project = ProjectDetailSchema.parse(await projectResponse.json());
        const credits = CreditsResponseSchema.parse(
          await creditsResponse.json(),
        );
        if (!project.video) {
          throw new Error("The finished project has no video yet");
        }
        publishCreditBalance(credits.available);
        setReceipt({
          project,
          video: project.video,
          job: finished,
          credits,
        });
        key.current = null;
        router.refresh();
        return;
      }

      const upgrade = UpgradeVideoResultSchema.parse(body);
      publishCreditBalance(upgrade.credits.available);
      setReceipt(upgrade);
      key.current = null;
      router.refresh();
    } catch (thrown) {
      if (thrown instanceof GenerationJobFailedError) {
        // Carries a clear, structured message straight from the job (e.g.
        // a QUALITY_GATE_REJECTED or LOCKED_FIELD_VIOLATION rejection) —
        // surface it instead of a generic fallback.
        setError(thrown.job.errorMessage ?? "Video generation failed.");
      } else {
        setError(
          "The video response could not be verified. Your storyboard is intact; reload the project before retrying.",
        );
      }
    } finally {
      setPending(false);
      setPhase(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={pending}>
            {pending
              ? "Rendering…"
              : isRegeneration
                ? "Regenerate video · 12 cr"
                : "Generate video · 12 cr"}
          </Button>
        </DialogTrigger>
        <DialogContent aria-label="Video generation">
          <DialogHeader>
            <DialogTitle>
              {isRegeneration
                ? "Regenerate this video"
                : "Turn this storyboard into a vertical motion preview"}
            </DialogTitle>
            <DialogDescription>
              {isRegeneration
                ? "A new render is generated from the storyboard. Lock any field below to keep it unchanged."
                : "Creonome attempts a real 9:16 Veo render first, with the resilient deterministic preview ready if the provider is unavailable."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            12 credits will be reserved. They are only charged if the video
            preview is rendered.
          </p>
          {video ? (
            <div className="flex flex-col gap-3 rounded-[8px] border border-border p-3.5">
              <p className="m-0 font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
                Lock fields to keep them unchanged
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {VIDEO_LOCKABLE_FIELDS.map(([field, fieldLabel]) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 text-[12px] text-foreground"
                  >
                    <Checkbox
                      checked={lockedFieldsState.has(field)}
                      onCheckedChange={(checked) =>
                        toggleLock(field, checked === true)
                      }
                    />
                    {fieldLabel} — {video[field]}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={generateVideo}>
              Confirm and generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pending ? (
        <GenerationToast
          state={phase === "queued" ? "queued" : "running"}
          title={
            phase === "queued"
              ? "Queued to render your vertical video"
              : "Rendering your vertical video"
          }
          detail={
            phase === "queued"
              ? "Waiting for the generation queue to pick this up."
              : "Veo is composing the saved script and storyboard. The resilient preview will take over automatically if needed."
          }
          creditLabel="12 credits held"
        />
      ) : receipt ? (
        <GenerationToast
          state="success"
          title={
            receipt.video.simulated
              ? "Video preview ready — generated with MVP fallback."
              : "Video ready"
          }
          detail={
            receipt.video.simulated
              ? "The deterministic 9:16 preview is saved and downloadable; your workflow stayed uninterrupted."
              : "The Veo render is safely stored in this project and ready to play or download."
          }
          onDismiss={() => setReceipt(null)}
        />
      ) : error ? (
        <GenerationToast
          state="error"
          title="Video not generated"
          detail={error}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
