"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavigationItemActive } from "./navigation-state";

const navigation = [
  { href: "/today", label: "Today" },
  { href: "/projects", label: "Projects" },
  { href: "/library", label: "Library" },
  { href: "/creator-dna", label: "Creator DNA" },
];

export function AppNavigation({
  className,
  itemClassName,
  activeItemClassName,
  progressClassName,
}: {
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  progressClassName?: string;
}) {
  const pathname = usePathname();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    setPendingLabel(null);
  }, [pathname]);

  return (
    <>
      <nav className={className} aria-label="Primary navigation">
        {navigation.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? activeItemClassName : itemClassName}
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
          className={progressClassName}
          role="progressbar"
          aria-label={`Loading ${pendingLabel}`}
        >
          <span />
        </div>
      ) : null}
    </>
  );
}
