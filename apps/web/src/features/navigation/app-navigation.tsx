"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
}: {
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary navigation">
      {navigation.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? activeItemClassName : itemClassName}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
