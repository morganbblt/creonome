"use client";

import {
  OpportunityBatchSchema,
  type OpportunityBatch,
} from "@creonome/contracts";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

const directions = [
  "Closer to my DNA",
  "More experimental",
  "Easier to shoot",
] as const;

function batchRequestKey(): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return `batch-${suffix}`;
}

export function TodayBatchGenerator({
  preview = false,
  onGenerated,
}: {
  preview?: boolean;
  onGenerated?: (batch: OpportunityBatch) => void;
}) {
  const router = useRouter();
  const requestKey = useRef<string | null>(null);
  const [selectedDirections, setSelectedDirections] = useState<
    Array<(typeof directions)[number]>
  >(["Closer to my DNA"]);
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
        body: JSON.stringify({
          directions: selectedDirections.length
            ? selectedDirections
            : undefined,
        }),
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
      const parsedBatch = OpportunityBatchSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsedBatch.success) {
        setError(
          "The new batch was created, but its response could not be displayed. Reload Today to recover it.",
        );
        requestKey.current = null;
        router.refresh();
        return;
      }
      requestKey.current = null;
      onGenerated?.(parsedBatch.data);
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
      <div
        className="flex flex-wrap gap-1.5"
        aria-label="Opportunity filters"
      >
        {directions.map((item) => {
          const selected = selectedDirections.includes(item);
          return (
            <button
              type="button"
              aria-pressed={selected}
              key={item}
              onClick={() =>
                setSelectedDirections((current) =>
                  current.includes(item)
                    ? current.filter((direction) => direction !== item)
                    : [...current, item],
                )
              }
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                selected
                  ? "border-foreground bg-secondary text-foreground"
                  : "border-input text-muted-foreground hover:bg-secondary",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
      <Button type="button" disabled={pending} onClick={() => void generate()}>
        {pending
          ? "Generating 3 opportunities…"
          : preview
            ? "Try live generation · 3 credits"
            : "+ 3 new opportunities · 3 credits"}
      </Button>
      {error ? (
        <p className="m-0 ml-auto max-w-70 text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="m-0 ml-auto text-right font-mono text-[11px] text-muted-foreground">
          previous batch stays in Projects
        </p>
      )}
    </>
  );
}
