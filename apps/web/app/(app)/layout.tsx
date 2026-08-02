import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "../../src/features/brand/brand-wordmark";
import { AppNavigation } from "../../src/features/navigation/app-navigation";
import { CreditBalance } from "../../src/features/navigation/credit-balance";
import { ThemeToggle } from "../../src/features/theme/theme-toggle";
import { createServerApiClient } from "../../src/lib/api/server-client";
import { getAuth } from "../../src/lib/auth/server";
import styles from "./shell.module.css";

export const dynamic = "force-dynamic";

async function loadAvailableCredits(): Promise<number | null> {
  try {
    return (await createServerApiClient().getCredits()).available;
  } catch {
    return null;
  }
}

type HeaderIdentity = {
  name: string;
  initials: string;
};

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function loadHeaderIdentity(): Promise<HeaderIdentity> {
  try {
    const { data: session } = await getAuth().getSession();
    const name =
      session?.user.name.trim() ||
      session?.user.email.split("@")[0]?.trim() ||
      "Creator";
    return { name, initials: initialsFor(name) };
  } catch {
    return { name: "Creator", initials: "CR" };
  }
}

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [availableCredits, identity] = await Promise.all([
    loadAvailableCredits(),
    loadHeaderIdentity(),
  ]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/today" className={styles.brand} aria-label="Creonome home">
          <BrandWordmark />
        </Link>
        <AppNavigation
          className={styles.primaryNav}
          itemClassName={styles.navItem}
          activeItemClassName={styles.activeNavItem}
          progressClassName={styles.routeProgress}
        />
        <div className={styles.accountActions}>
          <CreditBalance
            className={styles.credits}
            initialAvailable={availableCredits}
          />
          <ThemeToggle className={styles.settings} />
          <span
            className={styles.avatar}
            aria-label={identity.name}
            title={identity.name}
          >
            {identity.initials}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
