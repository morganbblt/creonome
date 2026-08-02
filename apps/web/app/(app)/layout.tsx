import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "../../src/features/brand/brand-wordmark";
import { AppNavigation } from "../../src/features/navigation/app-navigation";
import { CreditBalance } from "../../src/features/navigation/credit-balance";
import { createServerApiClient } from "../../src/lib/api/server-client";
import styles from "./shell.module.css";

export const dynamic = "force-dynamic";

async function loadAvailableCredits(): Promise<number | null> {
  try {
    return (await createServerApiClient().getCredits()).available;
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const availableCredits = await loadAvailableCredits();

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
        />
        <div className={styles.accountActions}>
          <CreditBalance
            className={styles.credits}
            initialAvailable={availableCredits}
          />
          <Link
            href="/settings/billing"
            className={styles.settings}
            aria-label="Settings"
          >
            ⌘
          </Link>
          <span className={styles.avatar} aria-label="Nova Sainte">
            NS
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
