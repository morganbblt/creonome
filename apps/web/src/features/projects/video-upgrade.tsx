"use client";

import {
  UpgradeVideoResultSchema,
  type UpgradeVideoResult,
} from "@creonome/contracts";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { GenerationToast } from "../generation/generation-toast";
import { publishCreditBalance } from "../navigation/credit-balance";
import styles from "./projects.module.css";

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
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeVideoResult | null>(null);

  async function generateVideo() {
    setPending(true);
    setConfirming(false);
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
    <>
      <section className={styles.upgradeCard} aria-label="Video generation">
        <div>
          <p>READY FOR LEVEL 04</p>
          <h2>Turn this storyboard into a vertical motion preview.</h2>
          <span>
            A deterministic 9:16 MVP render connects the complete workflow and
            remains downloadable from this project.
          </span>
        </div>

        {!confirming ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            {pending ? "Rendering…" : "Generate MVP video · 12 cr"}
          </button>
        ) : (
          <div className={styles.upgradeConfirmation}>
            <p>
              12 credits will be reserved. They are only charged if the video
              preview is rendered.
            </p>
            <div>
              <button type="button" onClick={generateVideo}>
                Confirm and generate
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {pending ? (
        <GenerationToast
          state="pending"
          title="Rendering your MVP video"
          detail="Composing the vertical motion preview from the saved storyboard."
          creditLabel="12 credits held"
        />
      ) : receipt ? (
        <GenerationToast
          state="success"
          title="Video ready"
          detail="The vertical preview is saved to this project and ready to download."
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
    </>
  );
}
