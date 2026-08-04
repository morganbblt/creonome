"use client";

import {
  CreditsResponseSchema,
  ProjectDetailSchema,
  QueuedGenerationJobSchema,
  UpgradeProjectResultSchema,
  type UpgradeProjectResult,
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

function storyboardErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before generating the storyboard. No credits were charged.";
  }
  if (status === 402) {
    return "There are not enough available credits for this storyboard. No credits were charged.";
  }
  if (status === 404) {
    return "This project no longer has an available script. Reload it before generating a storyboard. No credits were charged.";
  }
  if (status === 409) {
    return "This project changed in another session. Reload it before generating a storyboard. No credits were charged.";
  }
  if (status === 429 || status === 503) {
    return "Storyboard generation is temporarily unavailable. Your script is intact and no credits were charged. Try again in a moment.";
  }
  return "The storyboard request could not be confirmed. Your script is intact; retry to safely resume the same request.";
}

function createIdempotencyKey(projectId: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `storyboard-${projectId}-${suffix}`;
}

export function StoryboardUpgrade({ projectId }: { projectId: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<"queued" | "running" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeProjectResult | null>(null);
  const [sceneCount, setSceneCount] = useState<number | null>(null);

  async function generateStoryboard() {
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
            targetLevel: "storyboard",
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
            "The reserved credits were released. Your script is intact; start a fresh request to try again.",
          );
        } else {
          setError(storyboardErrorMessage(response.status));
        }
        return;
      }

      const body = await response.json();
      const queued = QueuedGenerationJobSchema.safeParse(body);
      if (queued.success && queued.data.job.status !== "succeeded") {
        // Storyboard generation now runs on the Cloud Tasks queue instead
        // of inline: poll the job, then load the finished storyboard.
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
          throw new Error("Could not load the finished storyboard");
        }
        const project = ProjectDetailSchema.parse(
          await projectResponse.json(),
        );
        const credits = CreditsResponseSchema.parse(
          await creditsResponse.json(),
        );
        if (!project.storyboard) {
          throw new Error("The finished project has no storyboard yet");
        }
        publishCreditBalance(credits.available);
        setSceneCount(project.storyboard.scenes.length);
        setReceipt({
          project,
          storyboard: project.storyboard,
          job: finished,
          credits,
        });
        key.current = null;
        router.refresh();
        return;
      }

      const upgrade = UpgradeProjectResultSchema.parse(body);
      publishCreditBalance(upgrade.credits.available);
      setSceneCount(upgrade.storyboard.scenes.length);
      setReceipt(upgrade);
      key.current = null;
      router.refresh();
    } catch {
      setError(
        "The storyboard response could not be verified. Your script is intact; reload the project before retrying.",
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
            {pending ? "Generating…" : "Generate storyboard · 4 cr"}
          </Button>
        </DialogTrigger>
        <DialogContent aria-label="Storyboard generation">
          <DialogHeader>
            <DialogTitle>
              Turn this script into a shootable sequence
            </DialogTitle>
            <DialogDescription>
              Timecodes, framing, action, audio, assets and edit notes for every
              scene.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            4 credits will be reserved. They are only charged if the storyboard
            is generated.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={generateStoryboard}>
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
              ? "Queued to build the storyboard"
              : "Building the storyboard"
          }
          detail={
            phase === "queued"
              ? "Waiting for the generation queue to pick this up."
              : "Structuring scenes, framing, action and edit notes."
          }
          creditLabel="4 credits held"
        />
      ) : receipt ? (
        <GenerationToast
          state="success"
          title="Storyboard ready"
          detail={`${sceneCount ?? receipt.storyboard.scenes.length} scenes saved to this project. Opening the latest version.`}
          onDismiss={() => setReceipt(null)}
        />
      ) : error ? (
        <GenerationToast
          state="error"
          title="Storyboard not generated"
          detail={error}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
