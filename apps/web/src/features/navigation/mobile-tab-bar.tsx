"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import {
  isNavigationItemActive,
  primaryNavigationItems,
} from "./navigation-state";

/**
 * The mobile equivalent of the desktop header nav: a bottom tab bar with the
 * same four primary destinations, fixed to the viewport bottom and hidden on
 * wider screens where the header nav takes over. See navigation-state.ts for
 * the shared list of destinations.
 */
export function MobileTabBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-[200] hidden items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg max-[760px]:flex",
        className,
      )}
      aria-label="Primary navigation"
    >
      {primaryNavigationItems.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-medium whitespace-nowrap text-muted-foreground transition-colors",
              active ? "text-foreground" : "hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
