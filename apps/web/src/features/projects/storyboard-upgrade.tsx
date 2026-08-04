"use client";

import {
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
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeProjectResult | null>(null);

  async function generateStoryboard() {
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

      const upgrade = UpgradeProjectResultSchema.parse(await response.json());
      publishCreditBalance(upgrade.credits.available);
      setReceipt(upgrade);
      key.current = null;
      router.refresh();
    } catch {
      setError(
        "The storyboard response could not be verified. Your script is intact; reload the project before retrying.",
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
          state="pending"
          title="Building the storyboard"
          detail="Structuring scenes, framing, action and edit notes."
          creditLabel="4 credits held"
        />
      ) : receipt ? (
        <GenerationToast
          state="success"
          title="Storyboard ready"
          detail={`${receipt.storyboard.scenes.length} scenes saved to this project. Opening the latest version.`}
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
