"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";

export const creditBalanceChangedEvent = "creonome:credit-balance-changed";

export function publishCreditBalance(available: number): void {
  window.dispatchEvent(
    new CustomEvent<number>(creditBalanceChangedEvent, { detail: available }),
  );
}

export function CreditBalance({
  initialAvailable,
  className,
}: {
  initialAvailable: number | null;
  className?: string;
}) {
  const [available, setAvailable] = useState(initialAvailable);

  useEffect(() => {
    setAvailable(initialAvailable);
  }, [initialAvailable]);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === "number" && Number.isFinite(detail)) {
        setAvailable(detail);
      }
    };
    window.addEventListener(creditBalanceChangedEvent, update);
    return () => window.removeEventListener(creditBalanceChangedEvent, update);
  }, []);

  return (
    <Link
      aria-label={`Available credits: ${available ?? "unavailable"}`}
      className={cn(
        "inline-grid h-9.5 place-items-center rounded-full bg-secondary px-3.5 font-mono text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-secondary/70 max-[760px]:hidden",
        className,
      )}
      href="/credits"
    >
      {available ?? "—"} cr
    </Link>
  );
}
