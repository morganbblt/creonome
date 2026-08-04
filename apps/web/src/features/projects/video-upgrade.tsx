"use client";

import {
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
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeVideoResult | null>(null);

  async function generateVideo() {
    setOpen(false);
    setPending(true);
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

      const upgrade = UpgradeVideoResultSchema.parse(await response.json());
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
              Creonome attempts a real 9:16 Veo render first, with the
              resilient deterministic preview ready if the provider is
              unavailable.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            12 credits will be reserved. They are only charged if the video
            preview is rendered.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
          state="pending"
          title="Rendering your vertical video"
          detail="Veo is composing the saved script and storyboard. The resilient preview will take over automatically if needed."
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
