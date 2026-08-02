import Link from "next/link";
import type { ReactNode } from "react";
import { AppNavigation } from "../../src/features/navigation/app-navigation";
import { CreditBalance } from "../../src/features/navigation/credit-balance";
import { createServerApiClient } from "../../src/lib/api/server-client";
import styles from "./shell.module.css";

export const dynamic = "force-dynamic";

function LogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 302 302" className={styles.logoMark}>
      <path d="M156 0C183.614 0 206 22.3858 206 50V180C206 194.359 194.359 206 180 206H120V252C120 266.359 131.641 278 146 278H252C266.359 278 278 266.359 278 252V146C278 131.641 266.359 120 252 120H216V96H252C279.614 96 302 118.386 302 146V252C302 279.614 279.614 302 252 302H146C118.386 302 96 279.614 96 252V122C96 107.641 107.641 96 122 96H182V50C182 35.6406 170.359 24 156 24H50C35.6406 24 24 35.6406 24 50V156C24 170.359 35.6406 182 50 182H86V206H50C22.3858 206 0 183.614 0 156V50C0 22.3858 22.3858 0 50 0H156Z" />
    </svg>
  );
}

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
          <LogoMark />
          <span>Creonome</span>
        </Link>
        <AppNavigation
          className={styles.primaryNav}
          itemClassName={styles.navItem}
          activeItemClassName={styles.activeNavItem}
          activeDotClassName={styles.activeDot}
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
