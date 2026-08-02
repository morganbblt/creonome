import Link from "next/link";
import type { LegalDocumentSlug } from "./legal-documents";
import { legalDocuments } from "./legal-documents";
import styles from "./legal-page.module.css";

export function LegalPage({ document }: { document: LegalDocumentSlug }) {
  const content = legalDocuments[document];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Creonome
        </Link>
        <Link href="/auth/sign-in" className={styles.back}>
          Back to sign in
        </Link>
      </header>
      <article className={styles.document}>
        <p className={styles.status}>
          Pre-launch draft · Updated 2 August 2026
        </p>
        <h1>{content.title}</h1>
        <p className={styles.summary}>{content.summary}</p>
        <div className={styles.sections}>
          {content.sections.map((section) => (
            <p key={section}>{section}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
