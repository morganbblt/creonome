import {
  ArrowRightIcon,
  ClapperboardIcon,
  DnaIcon,
  PlayIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { BrandWordmark } from "@/src/features/brand/brand-wordmark";

const pillars = [
  {
    icon: TrendingUpIcon,
    title: "Trend intelligence",
    description:
      "Understands what's moving across TikTok and Instagram right now, and why — not just a list of hashtags.",
  },
  {
    icon: DnaIcon,
    title: "Creator DNA",
    description:
      "Learns your tone, boundaries and preferences from what you've already made, and stays correctable at every step.",
  },
  {
    icon: ClapperboardIcon,
    title: "Creative production",
    description:
      "Turns a picked opportunity into a script, a storyboard, then a publish-ready video — each level costed up front.",
  },
] as const;

const notThis = [
  "a trend list",
  "a generic chatbot",
  "a generic script generator",
  "a promise of virality",
  "a tool that clones you",
] as const;

const principles = [
  {
    title: "Three strong picks beat thirty average ones",
    description:
      "The feed surfaces three opportunities at a time, chosen for fit — not a wall of suggestions to sift through.",
  },
  {
    title: "You stay the creative director",
    description:
      "Every recommendation explains itself. A score is decision support, never a promise of performance.",
  },
  {
    title: "Costs shown before every action",
    description:
      "Credits are quoted up front and released automatically if a generation fails. Nothing is charged silently.",
  },
  {
    title: "Memory you can correct",
    description:
      "Your Creator DNA is never fixed. Every trait it learns stays visible, editable, and reversible.",
  },
] as const;

const steps = [
  {
    index: "01",
    title: "See today's signal",
    description:
      "Three vertical-video opportunities, matched to your creative identity and this week's momentum.",
  },
  {
    index: "02",
    title: "Adapt it, in chat",
    description:
      "Nudge the hook, tone, or pacing in plain language. The original idea stays in version history.",
  },
  {
    index: "03",
    title: "Produce, level by level",
    description:
      "Idea → script → storyboard → video, generated one costed step at a time. You approve every jump.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5.5 max-[620px]:px-3.5">
          <Link href="/" aria-label="Creonome home" className="flex items-center">
            <BrandWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button type="button" asChild>
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto w-full max-w-[1180px] px-5.5 pt-16 pb-20 max-[620px]:px-3.5 max-[620px]:pt-10 max-[620px]:pb-14">
          <div className="grid grid-cols-[minmax(0,1fr)_420px] items-center gap-14 max-[980px]:grid-cols-1 max-[980px]:gap-10">
            <div>
              <p className="mb-4 font-mono text-[11px] font-semibold tracking-[0.1em] text-accent uppercase">
                Your creative operating system
              </p>
              <h1 className="m-0 max-w-[16ch] text-[clamp(38px,5.2vw,64px)] leading-[1.02] font-semibold tracking-[-0.03em] text-foreground text-balance">
                Know what to make next.
              </h1>
              <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.6] text-muted-foreground">
                Creonome finds vertical-video opportunities that fit your
                creative DNA, then turns them into scripts, storyboards and
                publish-ready videos — three strong picks at a time, never
                thirty average ones.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button type="button" size="lg" asChild>
                  <Link href="/auth/sign-up">
                    Get started free
                    <ArrowRightIcon />
                  </Link>
                </Button>
                <Button type="button" size="lg" variant="outline" asChild>
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                No credit card required. Three opportunities, on the house.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative rounded-panel border border-border bg-card p-5 shadow-lg max-[980px]:justify-self-center max-[980px]:w-full max-[980px]:max-w-[420px]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <Badge className="border-transparent bg-accent-soft text-accent-soft-foreground">
                  <span className="size-1.5 rounded-full bg-current" />
                  Natural fit
                </Badge>
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-accent-soft px-2 py-1 text-accent-soft-foreground">
                    New signal
                  </span>
                  0:28
                </span>
              </div>
              <div className="relative grid h-[168px] place-items-center overflow-hidden rounded-[8px] border border-border bg-gradient-to-br from-secondary via-secondary to-muted-foreground/20">
                <span className="grid size-12 place-items-center rounded-full bg-foreground/90 text-background shadow-lg">
                  <PlayIcon className="size-5 translate-x-0.5 fill-background" />
                </span>
                <span className="absolute top-3 left-3 rounded-full bg-background/85 px-2 py-1 font-mono text-[9px] font-medium tracking-wide text-foreground backdrop-blur-sm">
                  9:16
                </span>
              </div>
              <div className="mt-4">
                <h2 className="m-0 text-base font-semibold text-foreground">
                  Silent studio: a beat built with zero voice
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-foreground">
                  Captions carry the whole narration while the room stays
                  quiet.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-end gap-1.5">
                  <strong className="font-mono text-2xl leading-none font-semibold tracking-[-0.02em]">
                    91
                  </strong>
                  <span className="pb-0.5 font-mono text-[11px] text-muted-foreground">
                    /100
                  </span>
                </div>
                <span className="rounded-control bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground">
                  Move to script
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section className="border-t border-border bg-secondary/40 py-20 max-[620px]:py-14">
          <div className="mx-auto w-full max-w-[1180px] px-5.5 max-[620px]:px-3.5">
            <div className="mx-auto max-w-[60ch] text-center">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Three things, working together
              </p>
              <h2 className="m-0 text-[clamp(26px,3.4vw,36px)] leading-[1.1] font-semibold tracking-[-0.02em] text-foreground text-balance">
                Not a trend list. Not a chatbot. Not a clone of you.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-5 max-[820px]:grid-cols-1">
              {pillars.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-card border border-border bg-card p-6 shadow-sm"
                >
                  <span className="grid size-11 place-items-center rounded-control bg-accent-soft text-accent-soft-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 mb-1.5 text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-[13.5px] leading-[1.6] text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-[70ch] text-center text-sm text-muted-foreground">
              Creonome isn't{" "}
              {notThis.map((item, index) => (
                <span key={item}>
                  {index > 0 ? (index === notThis.length - 1 ? ", or " : ", ") : ""}
                  <span className="font-medium text-foreground/80 line-through decoration-muted-foreground/60">
                    {item}
                  </span>
                </span>
              ))}
              . It's the meeting point of all three.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 max-[620px]:py-14">
          <div className="mx-auto w-full max-w-[1180px] px-5.5 max-[620px]:px-3.5">
            <div className="mx-auto max-w-[60ch] text-center">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                How it works
              </p>
              <h2 className="m-0 text-[clamp(26px,3.4vw,36px)] leading-[1.1] font-semibold tracking-[-0.02em] text-foreground text-balance">
                From signal to publish-ready, one approved step at a time.
              </h2>
            </div>

            <ol className="mt-12 grid grid-cols-3 gap-8 max-[820px]:grid-cols-1 max-[820px]:gap-6">
              {steps.map((step, index) => (
                <li key={step.index} className="relative">
                  <span className="font-mono text-xs font-semibold text-accent">
                    {step.index}
                  </span>
                  <h3 className="mt-2 mb-1.5 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-[13.5px] leading-[1.6] text-muted-foreground">
                    {step.description}
                  </p>
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 left-[calc(100%+16px)] hidden w-8 border-t border-dashed border-border min-[821px]:block"
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section className="border-t border-border bg-secondary/40 py-20 max-[620px]:py-14">
          <div className="mx-auto w-full max-w-[1180px] px-5.5 max-[620px]:px-3.5">
            <div className="mx-auto max-w-[60ch] text-center">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Built on a few strong opinions
              </p>
              <h2 className="m-0 text-[clamp(26px,3.4vw,36px)] leading-[1.1] font-semibold tracking-[-0.02em] text-foreground text-balance">
                Not everything is a feature. Some things are a stance.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-5 max-[680px]:grid-cols-1">
              {principles.map(({ title, description }) => (
                <div
                  key={title}
                  className="rounded-card border border-border bg-card p-5 shadow-sm"
                >
                  <h3 className="m-0 mb-1.5 text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="m-0 text-[13.5px] leading-[1.6] text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 max-[620px]:py-14">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center gap-5 px-5.5 text-center max-[620px]:px-3.5">
            <h2 className="m-0 max-w-[24ch] text-[clamp(28px,3.8vw,42px)] leading-[1.05] font-semibold tracking-[-0.025em] text-foreground text-balance">
              Your next three ideas are waiting.
            </h2>
            <p className="max-w-[48ch] text-[15px] leading-[1.6] text-muted-foreground">
              Set up your Creator DNA in a few minutes and see today's picks.
            </p>
            <Button type="button" size="lg" asChild>
              <Link href="/auth/sign-up">
                Get started free
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5.5 py-8 max-[620px]:px-3.5">
          <Link href="/" aria-label="Creonome home" className="flex items-center">
            <BrandWordmark className="w-[110px]" />
          </Link>
          <nav
            className="flex flex-wrap items-center gap-4.5 text-[11px] text-muted-foreground"
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
        </div>
      </footer>
    </div>
  );
}
