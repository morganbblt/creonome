import Link from "next/link";
import { BrandWordmark } from "../brand/brand-wordmark";
import type { LegalDocumentSlug } from "./legal-documents";
import { legalDocuments } from "./legal-documents";

export function LegalPage({ document }: { document: LegalDocumentSlug }) {
  const content = legalDocuments[document];

  return (
    <main className="min-h-svh bg-background">
      <header className="flex min-h-17 items-center justify-between gap-4 border-b border-border px-5.5 max-[760px]:px-3.5">
        <Link href="/" className="block w-[142px]">
          <BrandWordmark />
        </Link>
        <Link
          href="/auth/sign-in"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to sign in
        </Link>
      </header>
      <article className="mx-auto w-[min(720px,calc(100%-40px))] py-14.5 pb-22 sm:py-26">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-accent">
          Pre-launch draft · Updated 2 August 2026
        </p>
        <h1 className="text-[40px] leading-none font-medium tracking-tight sm:text-[68px]">
          {content.title}
        </h1>
        <p className="mt-6 max-w-[600px] text-lg leading-relaxed text-muted-foreground">
          {content.summary}
        </p>
        <div className="mt-13.5 grid gap-5 border-t border-border pt-9">
          {content.sections.map((section) => (
            <p
              key={section}
              className="text-[15px] leading-relaxed text-foreground"
            >
              {section}
            </p>
          ))}
        </div>
      </article>
    </main>
  );
}
