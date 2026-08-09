import { Dna, FolderKanban, LibraryBig, Sunrise } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PrimaryNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * The four primary destinations, shared by the desktop header nav and the
 * mobile bottom tab bar so both surfaces always agree on what "primary"
 * means. Per the product bible (13.2), mobile gets exactly these four tabs;
 * everything else (integrations, credits, settings) lives in the account menu.
 */
export const primaryNavigationItems: PrimaryNavigationItem[] = [
  { href: "/today", label: "Today", icon: Sunrise },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/creator-dna", label: "Creator DNA", icon: Dna },
];

export function isNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
