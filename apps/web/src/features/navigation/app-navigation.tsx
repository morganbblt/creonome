"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";
import { isNavigationItemActive } from "./navigation-state";

const navigation = [
  { href: "/today", label: "Today" },
  { href: "/projects", label: "Projects" },
  { href: "/library", label: "Library" },
  { href: "/creator-dna", label: "Creator DNA" },
];

export function AppNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    setPendingLabel(null);
  }, [pathname]);

  return (
    <>
      <nav
        className={cn(
          "flex items-center gap-7 overflow-x-auto max-[760px]:flex-1 max-[760px]:justify-between max-[760px]:gap-3.5",
          className,
        )}
        aria-label="Primary navigation"
      >
        {navigation.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center py-5.5 text-[13px] font-semibold whitespace-nowrap text-muted-foreground decoration-2 underline-offset-8 transition-colors max-[760px]:py-5 max-[520px]:text-xs",
                active ? "text-foreground underline" : "hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (!active) setPendingLabel(item.label);
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {pendingLabel ? (
        <div
          className="fixed inset-x-0 top-0 z-[210] h-[3px] overflow-hidden bg-accent/20"
          role="progressbar"
          aria-label={`Loading ${pendingLabel}`}
        >
          <span className="block h-full w-[42%] animate-route-sweep rounded-full bg-accent" />
        </div>
      ) : null}
    </>
  );
}
