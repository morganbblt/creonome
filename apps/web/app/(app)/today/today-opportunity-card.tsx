"use client";

import { ProjectSchema } from "@creonome/contracts";
import { ChevronDownIcon, PencilIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import type { DemoOpportunity } from "../../../src/features/opportunities/demo-opportunities";

const freshnessLabels = {
  new: "New signal",
  fresh: "Fresh this week",
  aging: "Aging signal",
} as const;

const freshnessClasses = {
  new: "bg-accent-soft text-accent-soft-foreground",
  fresh: "bg-secondary text-foreground",
  aging: "bg-secondary text-muted-foreground",
} as const;

const strategyClasses = {
  signature: "border-transparent bg-accent-soft text-accent-soft-foreground",
  stretch: "border-transparent bg-accent-soft text-accent-soft-foreground",
  repeatable: "border-border text-muted-foreground",
} as const;

function saveErrorMessage(status: number): string {
  if (status === 404) {
    return "This opportunity is no longer available. Refresh Today to load the current batch.";
  }
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before saving this idea.";
  }
  return "This idea could not be saved. Nothing was changed; try again.";
}

export function TodayOpportunityCard({
  opportunity,
  preview = false,
}: {
  opportunity: DemoOpportunity;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const menuId = useId();
  const detailsId = useId();
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function closeOutside(event: PointerEvent) {
      if (!cardRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  async function saveForLater() {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `/api/creonome/opportunities/${opportunity.id}/save`,
        { method: "POST" },
      );
      if (!response.ok) {
        setSaveError(saveErrorMessage(response.status));
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      const project = ProjectSchema.safeParse(payload);
      setSavedHref(
        project.success ? `/projects/${project.data.id}` : "/projects",
      );
    } catch {
      setSaveError(
        "The save could not be confirmed. Reload Projects before trying again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className="group relative flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-180 hover:-translate-y-0.5 hover:border-muted-foreground/40 hover:shadow-lg focus-within:-translate-y-0.5 focus-within:border-muted-foreground/40 focus-within:shadow-lg focus-visible:outline-none"
      ref={cardRef}
    >
      <div className="flex items-center justify-between gap-3">
        <Badge className={strategyClasses[opportunity.strategy]}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {opportunity.badge}
        </Badge>
        <span className="flex items-center gap-2 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-2 py-1",
              freshnessClasses[opportunity.freshness],
            )}
          >
            {freshnessLabels[opportunity.freshness]}
          </span>
          <span>{opportunity.duration}</span>
        </span>
      </div>

      <div
        className="relative grid h-[176px] place-items-center overflow-hidden rounded-[8px] border border-border bg-gradient-to-br from-secondary via-secondary to-muted-foreground/20"
        role="img"
        aria-label={`Synthetic portrait frame for ${opportunity.title}`}
      >
        <span className="grid size-12 place-items-center rounded-full bg-foreground/90 text-background shadow-lg">
          <PlayIcon className="size-5 translate-x-0.5 fill-background" />
        </span>
        <span className="absolute top-3 left-3 rounded-full bg-background/85 px-2 py-1 font-mono text-[9px] font-medium tracking-wide text-foreground backdrop-blur-sm">
          9:16
        </span>
      </div>

      <div>
        <h2 className="m-0 text-[19px] leading-[1.25] font-semibold tracking-[-0.015em] text-foreground text-pretty">
          {opportunity.title}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted-foreground">
          {opportunity.pitch}
        </p>
      </div>

      <button
        type="button"
        className="-mx-1 flex min-h-8 items-center justify-center gap-1.5 rounded-[6px] border-t border-border px-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        onClick={() => setDetailsOpen((current) => !current)}
      >
        <span>{detailsOpen ? "Hide details" : "Show details"}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-180",
            detailsOpen && "rotate-180",
          )}
        />
      </button>

      <div
        id={detailsId}
        className={cn(
          "grid transition-[grid-template-rows] duration-260 ease-out",
          detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="flex flex-col gap-3.5 overflow-hidden">
          <div className="border-l-2 border-accent pl-2.5">
            <span className="font-mono text-[11px] text-muted-foreground">
              HOOK
            </span>
            <p className="mt-1 text-[13px] leading-[1.45]">{opportunity.hook}</p>
          </div>
          <div className="border-t border-border pt-3.5">
            <div className="flex items-end gap-2">
              <strong className="font-mono text-[28px] leading-none font-semibold tracking-[-0.02em]">
                {opportunity.score}
              </strong>
              <span className="pb-0.5 font-mono text-[11px] text-muted-foreground">
                /100
              </span>
              <em className="ml-auto rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold not-italic">
                {opportunity.verdict}
              </em>
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-muted-foreground">
              {opportunity.confidence} confidence · {opportunity.effort} ·{" "}
              {opportunity.channel}
            </p>
            <span className="mt-3 block font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
              WHY
            </span>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
              {opportunity.why}
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-muted-foreground">
              <strong className="text-foreground">Reserve —</strong>{" "}
              {opportunity.reserve}
            </p>
          </div>
        </div>
      </div>

      {open && !preview ? (
        <div
          className="absolute right-5 bottom-18 left-5 z-10 flex flex-col gap-0.5 rounded-[8px] border border-border bg-card p-1.5 shadow-lg"
          id={menuId}
          role="menu"
          aria-label={`Actions for ${opportunity.title}`}
        >
          <p className="m-0 mb-1.5 px-2 pt-1 font-mono text-[10px] tracking-[0.09em] text-muted-foreground">
            ACTIONS
          </p>
          <Link
            href={`/opportunities/${opportunity.id}`}
            role="menuitem"
            className="flex min-h-10 items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-foreground no-underline transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
          >
            <span>Move to script</span>
            <span className="font-mono text-[10.5px] whitespace-nowrap text-muted-foreground">
              2 cr
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Generate a script first"
            className="flex min-h-10 items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
          >
            <span>Generate storyboard</span>
            <span className="font-mono text-[10.5px] whitespace-nowrap">4 cr</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Generate a storyboard first"
            className="flex min-h-10 items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
          >
            <span>Generate full video</span>
            <span className="font-mono text-[10.5px] whitespace-nowrap">
              12 cr
            </span>
          </button>
          <span
            className="mx-1.5 my-1 h-px bg-border"
            aria-hidden="true"
          />
          {savedHref ? (
            <Link
              href={savedHref}
              role="menuitem"
              className="flex min-h-10 items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-foreground no-underline transition-colors hover:bg-secondary"
            >
              <span>Saved in Projects</span>
              <span className="font-mono text-[10.5px] whitespace-nowrap text-muted-foreground">
                open →
              </span>
            </Link>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={saving}
              onClick={() => void saveForLater()}
              className="flex min-h-10 items-center justify-between gap-3 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{saving ? "Saving…" : "Save for later"}</span>
              <span className="font-mono text-[10.5px] whitespace-nowrap text-muted-foreground">
                free
              </span>
            </button>
          )}
          {saveError ? (
            <p className="m-0 px-2 pt-1.5 pb-1 text-[11.5px] leading-[1.45] font-medium text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex gap-2">
        {preview ? (
          <span className="grid min-h-10.5 flex-1 place-items-center rounded-control border border-input bg-secondary text-[12.5px] font-semibold text-muted-foreground">
            Demo preview
          </span>
        ) : (
          <>
            <div className="flex min-w-0 flex-1">
              <Link
                href={`/opportunities/${opportunity.id}`}
                className="grid min-h-11 flex-1 place-items-center rounded-l-control rounded-r-[2px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90"
              >
                Move to script{" "}
                <span className="ml-1.5 font-mono text-[11px] opacity-65">
                  {opportunity.creditCost} cr
                </span>
              </Link>
              <button
                type="button"
                aria-controls={menuId}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={`More actions for ${opportunity.title}`}
                onClick={() => setOpen((current) => !current)}
                className="grid w-9 place-items-center rounded-r-control rounded-l-[2px] border-l border-primary-foreground/20 bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ChevronDownIcon className="size-4" />
              </button>
            </div>
            <Link
              href={`/opportunities/${opportunity.id}?panel=modify`}
              aria-label={`Modify ${opportunity.title}`}
              className="grid size-11 shrink-0 place-items-center rounded-control border border-input text-foreground no-underline transition-colors hover:bg-secondary"
            >
              <PencilIcon className="size-4" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
