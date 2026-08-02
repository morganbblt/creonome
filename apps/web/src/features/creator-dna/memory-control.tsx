"use client";

import {
  MemoryReviewResultSchema,
  type MemoryCandidatesResponse,
  type PendingMemoryCandidate,
  type ReviewedMemoryCandidate,
} from "@creonome/contracts";
import { useState } from "react";
import styles from "./creator-dna.module.css";

type MemoryDecision = "approve" | "reject";

function sourceLabel(source: string): string {
  return source.replaceAll("_", " ");
}

function reviewLabel(status: ReviewedMemoryCandidate["status"]): string {
  return status === "approved" ? "Approved" : "Rejected";
}

export function MemoryControl({
  initialMemories,
}: {
  initialMemories: MemoryCandidatesResponse | null;
}) {
  const [memories, setMemories] = useState(initialMemories);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(
    candidate: PendingMemoryCandidate,
    decision: MemoryDecision,
  ) {
    setPendingId(candidate.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/memory-candidates/${candidate.id}/${decision}`,
        { method: "POST" },
      );
      if (!response.ok)
        throw new Error(`Memory review failed: ${response.status}`);
      const result = MemoryReviewResultSchema.parse(await response.json());
      const reviewed: ReviewedMemoryCandidate = {
        ...candidate,
        status: result.status,
        reviewedAt: result.reviewedAt,
      };
      setMemories((current) =>
        current
          ? {
              pendingCount: Math.max(0, current.pendingCount - 1),
              pending: current.pending.filter(({ id }) => id !== candidate.id),
              history: [reviewed, ...current.history],
            }
          : current,
      );
    } catch {
      setError("The memory decision could not be saved. Nothing changed.");
    } finally {
      setPendingId(null);
    }
  }

  if (!memories) {
    return (
      <aside className={styles.memory}>
        <div className={styles.memoryHeader}>
          <div>
            <span>MEMORY CONTROL</span>
            <h2>Memory review is temporarily unavailable.</h2>
          </div>
          <strong>Nothing was changed</strong>
        </div>
        <p>Your Creator DNA remains available and intact.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.memory} aria-label="Memory control">
      <div className={styles.memoryHeader}>
        <div>
          <span>MEMORY CONTROL</span>
          <h2>Nothing enters long-term memory without approval.</h2>
          <p>Review inferred preferences before they can influence new work.</p>
        </div>
        <strong>{memories.pendingCount} pending</strong>
      </div>

      {error ? (
        <p className={styles.memoryError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.memoryColumns}>
        <section className={styles.memoryQueue}>
          <h3>Proposed memory</h3>
          {memories.pending.length ? (
            memories.pending.map((candidate) => (
              <article className={styles.memoryCard} key={candidate.id}>
                <div className={styles.memoryMeta}>
                  <span>{candidate.scope ?? candidate.kind}</span>
                  <span>{sourceLabel(candidate.source)}</span>
                </div>
                <p>{candidate.content}</p>
                <div className={styles.memoryActions}>
                  <button
                    className={styles.accept}
                    disabled={pendingId !== null}
                    onClick={() => review(candidate, "approve")}
                    type="button"
                  >
                    {pendingId === candidate.id ? "Saving…" : "Accept memory"}
                  </button>
                  <button
                    className={styles.reject}
                    disabled={pendingId !== null}
                    onClick={() => review(candidate, "reject")}
                    type="button"
                  >
                    Reject memory
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className={styles.memoryEmpty}>No memory awaiting review.</p>
          )}
        </section>

        <section className={styles.memoryHistory}>
          <h3>Change history</h3>
          {memories.history.length ? (
            <ol>
              {memories.history.map((candidate) => (
                <li key={candidate.id}>
                  <div>
                    <strong data-status={candidate.status}>
                      {reviewLabel(candidate.status)}
                    </strong>
                    <time dateTime={candidate.reviewedAt}>
                      {new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(candidate.reviewedAt))}
                    </time>
                  </div>
                  <p>{candidate.content}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.memoryEmpty}>No decisions yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
