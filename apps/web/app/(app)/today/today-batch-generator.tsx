"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import styles from "./today.module.css";

const directions = [
  "Closer to my DNA",
  "More experimental",
  "Easier to shoot",
] as const;

function batchRequestKey(): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `batch-${suffix}`;
}

export function TodayBatchGenerator() {
  const router = useRouter();
  const requestKey = useRef<string | null>(null);
  const [direction, setDirection] =
    useState<(typeof directions)[number]>("Closer to my DNA");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    requestKey.current ??= batchRequestKey();
    try {
      const response = await fetch("/api/creonome/opportunities/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
        },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          retryMode?: string;
        } | null;
        if (failure?.retryMode === "new_request") {
          requestKey.current = null;
          setError(
            "The reserved credits were released. Start a fresh request to try again.",
          );
        } else {
          setError(
            "The new batch could not be confirmed. Retry safely to resume this request.",
          );
        }
        return;
      }
      requestKey.current = null;
      router.refresh();
    } catch {
      setError(
        "The new batch could not be confirmed. Retry safely to resume this request.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" disabled={pending} onClick={generate}>
        {pending
          ? "Generating 3 opportunities…"
          : "+ 3 new opportunities · 3 credits"}
      </button>
      <div>
        {directions.map((item) => (
          <button
            type="button"
            aria-pressed={direction === item}
            className={
              direction === item ? styles.selectedDirection : undefined
            }
            key={item}
            onClick={() => setDirection(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error ? (
        <p className={styles.batchError} role="alert">
          {error}
        </p>
      ) : (
        <p>previous batch stays in Projects</p>
      )}
    </>
  );
}
