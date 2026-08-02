import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "../brand/brand-wordmark";
import styles from "./auth-shell.module.css";

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className={styles.page}>
      <section className={styles.story} aria-labelledby="auth-story-title">
        <Link href="/" className={styles.brand}>
          <BrandWordmark />
        </Link>
        <div className={styles.storyContent}>
          <p className={styles.eyebrow}>Your creative operating system</p>
          <h1 id="auth-story-title">Make the next idea feel like yours.</h1>
          <p className={styles.intro}>
            Turn signals, memory and instinct into concepts ready to create.
          </p>
          <div className={styles.signalCard} aria-hidden="true">
            <span>Signal found</span>
            <strong>Raw rehearsal footage is building momentum.</strong>
            <small>Fit with your DNA · 94%</small>
          </div>
        </div>
        <p className={styles.note}>
          Build to create a lot of vertical video content
        </p>
      </section>

      <section className={styles.authPanel} aria-label="Account access">
        <div className={styles.authCard}>{children}</div>
        <nav className={styles.legal} aria-label="Legal">
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/data-deletion">Data deletion</Link>
        </nav>
      </section>
    </main>
  );
}
