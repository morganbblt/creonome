"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      className={className}
      href="/credits"
    >
      {available ?? "—"} cr
    </Link>
  );
}
