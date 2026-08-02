"use client";

import { ProjectSchema } from "@creonome/contracts";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@/src/features/icons/icons";
import type { DemoOpportunity } from "../../../src/features/opportunities/demo-opportunities";
import styles from "./today.module.css";

const freshnessLabels = {
  new: "New signal",
  fresh: "Fresh this week",
  aging: "Aging signal",
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
    <article className={styles.card} ref={cardRef} tabIndex={0}>
      <div className={styles.cardMeta}>
        <span className={`${styles.badge} ${styles[opportunity.strategy]}`}>
          <span aria-hidden="true" />
          {opportunity.badge}
        </span>
        <span className={styles.cardTiming}>
          <span
            className={`${styles.freshness} ${styles[opportunity.freshness]}`}
          >
            {freshnessLabels[opportunity.freshness]}
          </span>
          <span>{opportunity.duration}</span>
        </span>
      </div>

      <div
        className={styles.media}
        role="img"
        aria-label={`Synthetic portrait frame for ${opportunity.title}`}
      >
        <span className={styles.frameLeft} />
        <span className={styles.frameRight} />
        <span className={styles.frameFront}>9:16</span>
      </div>

      <div className={styles.summary}>
        <h2>{opportunity.title}</h2>
        <p>{opportunity.pitch}</p>
      </div>

      <button
        type="button"
        className={styles.detailsToggle}
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        onClick={() => setDetailsOpen((current) => !current)}
      >
        <span>{detailsOpen ? "Hide details" : "Show details"}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={detailsOpen ? styles.detailsToggleIconOpen : undefined}
        />
      </button>

      <div
        className={styles.details}
        id={detailsId}
        data-open={detailsOpen || undefined}
      >
        <div className={styles.hook}>
          <span>HOOK</span>
          <p>{opportunity.hook}</p>
        </div>
        <div className={styles.score}>
          <div>
            <strong>{opportunity.score}</strong>
            <span>/100</span>
            <em>{opportunity.verdict}</em>
          </div>
          <p>
            {opportunity.confidence} confidence · {opportunity.effort} ·{" "}
            {opportunity.channel}
          </p>
          <span>WHY</span>
          <p>{opportunity.why}</p>
          <p>
            <strong>Reserve —</strong> {opportunity.reserve}
          </p>
        </div>
      </div>

      {open && !preview ? (
        <div
          className={styles.cardMenu}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${opportunity.title}`}
        >
          <p>ACTIONS</p>
          <Link href={`/opportunities/${opportunity.id}`} role="menuitem">
            <span>Move to script</span>
            <span>2 cr</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Generate a script first"
          >
            <span>Generate storyboard</span>
            <span>6 cr</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Video generation is coming soon"
          >
            <span>Generate full video</span>
            <span>17 cr</span>
          </button>
          <span className={styles.menuDivider} aria-hidden="true" />
          {savedHref ? (
            <Link href={savedHref} role="menuitem">
              <span>Saved in Projects</span>
              <span>open →</span>
            </Link>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={saving}
              onClick={() => void saveForLater()}
            >
              <span>{saving ? "Saving…" : "Save for later"}</span>
              <span>free</span>
            </button>
          )}
          {saveError ? (
            <p className={styles.menuError} role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        {preview ? (
          <span className={styles.previewAction}>Demo preview</span>
        ) : (
          <>
            <div className={styles.splitButton}>
              <Link href={`/opportunities/${opportunity.id}`}>
                Move to script <span>{opportunity.creditCost} cr</span>
              </Link>
              <button
                type="button"
                aria-controls={menuId}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={`More actions for ${opportunity.title}`}
                onClick={() => setOpen((current) => !current)}
              >
                ⌄
              </button>
            </div>
            <Link
              href={`/opportunities/${opportunity.id}?panel=modify`}
              className={styles.modify}
              aria-label={`Modify ${opportunity.title}`}
            >
              ✎
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
