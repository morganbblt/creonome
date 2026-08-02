"use client";

import {
  UpgradeProjectResultSchema,
  type UpgradeProjectResult,
} from "@creonome/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { publishCreditBalance } from "../navigation/credit-balance";
import styles from "./projects.module.css";

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
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UpgradeProjectResult | null>(null);

  async function generateStoryboard() {
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
      setConfirming(false);
      key.current = null;
    } catch {
      setError(
        "The storyboard response could not be verified. Your script is intact; reload the project before retrying.",
      );
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <section
        className={styles.generationReceipt}
        aria-label="Storyboard generation receipt"
      >
        <div className={styles.receiptTitle}>
          <span aria-hidden="true">✓</span>
          <div>
            <p>DELIVERED</p>
            <h2>Storyboard ready</h2>
          </div>
          <small>receipt {receipt.job.id.slice(-8)}</small>
        </div>

        <p className={styles.receiptSummary}>
          {receipt.storyboard.scenes.length} scene
          {receipt.storyboard.scenes.length === 1 ? "" : "s"} ·{" "}
          {receipt.storyboard.durationSeconds}s ·{" "}
          {receipt.storyboard.aspectRatio}
        </p>

        <dl className={styles.receiptLedger}>
          <div>
            <dt>Reservation</dt>
            <dd>4 credits held</dd>
          </div>
          <div>
            <dt>Committed</dt>
            <dd>−4 credits</dd>
          </div>
          <div>
            <dt>Generation</dt>
            <dd>
              {receipt.job.provider} · {receipt.job.model}
            </dd>
          </div>
          <div>
            <dt>Balance</dt>
            <dd>{receipt.credits.available} credits available</dd>
          </div>
        </dl>

        <p className={styles.receiptNote}>
          The storyboard is saved. Your original script and its version history
          remain intact.
        </p>
        <div className={styles.receiptActions}>
          <button type="button" onClick={() => router.refresh()}>
            Open storyboard
          </button>
          <Link href="/credits">Open ledger</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.upgradeCard} aria-label="Storyboard generation">
      <div>
        <p>READY FOR LEVEL 03</p>
        <h2>Turn this script into a shootable sequence.</h2>
        <span>
          Timecodes, framing, action, audio, assets and edit notes for every
          scene.
        </span>
      </div>

      {pending ? (
        <div className={styles.generationProgress} role="status">
          <div>
            <strong>Building the storyboard</strong>
            <span>4 credits held</span>
          </div>
          <progress aria-label="Storyboard generation progress" />
          <p>Structuring scenes, framing, action and edit notes.</p>
          <small>
            You can leave this page — the project and reservation are persisted.
          </small>
        </div>
      ) : !confirming ? (
        <button type="button" onClick={() => setConfirming(true)}>
          Generate storyboard · 4 cr
        </button>
      ) : (
        <div className={styles.upgradeConfirmation}>
          <p>
            4 credits will be reserved. They are only charged if the storyboard
            is generated.
          </p>
          <div>
            <button type="button" onClick={generateStoryboard}>
              Confirm and generate
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className={styles.upgradeError} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
