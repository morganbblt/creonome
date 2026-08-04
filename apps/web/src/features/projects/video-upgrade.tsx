"use client";

import {
  CreditsResponseSchema,
  ProjectDetailSchema,
  QueuedGenerationJobSchema,
  UpgradeVideoResultSchema,
  type UpgradeVideoResult,
} from "@creonome/contracts";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
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
import { pollGenerationJob } from "../generation/poll-generation-job";

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

export function VideoUpgrade({ projectId }: { projectId: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<"queued" | "running" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeVideoResult | null>(null);

  async function generateVideo() {
    setOpen(false);
    setPending(true);
    setPhase("running");
    setError(null);
    key.current ??= createIdempotencyKey(projectId);

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
        const project = ProjectDetailSchema.parse(
          await projectResponse.json(),
        );
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
    } catch {
      setError(
        "The video response could not be verified. Your storyboard is intact; reload the project before retrying.",
      );
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
            {pending ? "Rendering…" : "Generate video · 12 cr"}
          </Button>
        </DialogTrigger>
        <DialogContent aria-label="Video generation">
          <DialogHeader>
            <DialogTitle>
              Turn this storyboard into a vertical motion preview
            </DialogTitle>
            <DialogDescription>
              Creonome attempts a real 9:16 Veo render first, with the resilient
              deterministic preview ready if the provider is unavailable.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            12 credits will be reserved. They are only charged if the video
            preview is rendered.
          </p>
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
