import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "../brand/brand-wordmark";

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-svh grid-cols-[minmax(360px,1.05fr)_minmax(420px,0.95fr)] bg-background max-[860px]:grid-cols-1">
      <section
        className="relative flex min-h-svh flex-col overflow-hidden bg-gradient-to-br from-secondary to-accent-soft px-7 py-8.5 max-[860px]:min-h-0 max-[860px]:px-6 max-[860px]:py-5.5 max-[520px]:px-4.5"
        aria-labelledby="auth-story-title"
      >
        <Link href="/" className="z-10 block w-[174px]">
          <BrandWordmark className="w-full" />
        </Link>
        <div className="z-10 my-auto w-full max-w-[590px] py-18 max-[860px]:py-13 max-[520px]:pt-10">
          <p className="mb-4.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-accent-soft-foreground uppercase">
            Your creative operating system
          </p>
          <h1
            id="auth-story-title"
            className="m-0 max-w-[580px] text-[clamp(46px,5.7vw,82px)] leading-[0.98] font-medium tracking-[-0.065em] text-foreground max-[860px]:max-w-[640px] max-[860px]:text-[clamp(38px,10vw,62px)]"
          >
            Make the next idea feel like yours.
          </h1>
          <p className="mt-7 max-w-[470px] text-[17px] leading-[1.55] text-accent-soft-foreground max-[520px]:mt-5 max-[520px]:text-[15px]">
            Turn signals, memory and instinct into concepts ready to create.
          </p>
          <div
            className="mt-11 grid w-[min(390px,90%)] gap-2.5 rounded-control border border-border/60 bg-card/50 p-4.5 shadow-lg backdrop-blur-lg max-[860px]:hidden"
            aria-hidden="true"
          >
            <span className="font-mono text-[11px] font-medium text-muted-foreground">
              Signal found
            </span>
            <strong className="text-sm leading-[1.45] font-semibold text-foreground">
              Raw rehearsal footage is building momentum.
            </strong>
            <small className="font-mono text-[11px] font-medium text-muted-foreground">
              Fit with your DNA · 94%
            </small>
          </div>
        </div>
        <p className="z-10 m-0 text-xs text-accent-soft-foreground max-[860px]:hidden">
          Build to create a lot of vertical video content
        </p>
      </section>

      <section
        className="flex min-h-svh flex-col items-center justify-center px-[clamp(24px,6vw,88px)] pt-11 pb-7 max-[860px]:min-h-0 max-[860px]:px-6 max-[860px]:pt-12 max-[520px]:px-4.5 max-[520px]:pt-9.5"
        aria-label="Account access"
      >
        <div className="w-[min(100%,430px)]">{children}</div>
        <nav
          className="mt-9.5 flex flex-wrap justify-center gap-4.5 text-[11px] text-muted-foreground"
          aria-label="Legal"
        >
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/data-deletion" className="hover:text-foreground">
            Data deletion
          </Link>
        </nav>
      </section>
    </main>
  );
}
