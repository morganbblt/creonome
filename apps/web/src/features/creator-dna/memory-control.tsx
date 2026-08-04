"use client";

import {
  MemoryReviewResultSchema,
  type MemoryCandidatesResponse,
  type PendingMemoryCandidate,
  type ReviewedMemoryCandidate,
} from "@creonome/contracts";
import { CheckIcon, InboxIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

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
      <section aria-label="Memory control" className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
          Memory control
        </h2>
        <Card>
          <CardContent className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              <InboxIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Memory review is temporarily unavailable.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your Creator DNA remains available and intact.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label="Memory control" className="mt-8">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Memory control
          </h2>
          <p className="mt-1 max-w-lg text-xs text-muted-foreground">
            Nothing enters long-term memory without approval. Review inferred
            preferences before they can influence new work.
          </p>
        </div>
        <Badge variant={memories.pendingCount > 0 ? "accent" : "outline"}>
          {memories.pendingCount} pending
        </Badge>
      </div>

      {error ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Proposed memory
          </h3>
          {memories.pending.length ? (
            <div className="flex flex-col gap-3">
              {memories.pending.map((candidate) => (
                <Card key={candidate.id}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="tracking-wide uppercase">
                        {candidate.scope ?? candidate.kind}
                      </span>
                      <span>{sourceLabel(candidate.source)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {candidate.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={pendingId !== null}
                        onClick={() => review(candidate, "approve")}
                        size="sm"
                        type="button"
                      >
                        <CheckIcon />
                        {pendingId === candidate.id
                          ? "Saving…"
                          : "Accept memory"}
                      </Button>
                      <Button
                        disabled={pendingId !== null}
                        onClick={() => review(candidate, "reject")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <XIcon />
                        Reject memory
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-control border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No memory awaiting review.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:border-l lg:border-border lg:pl-5">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Change history
          </h3>
          {memories.history.length ? (
            <ol className="flex flex-col gap-3">
              {memories.history.map((candidate) => (
                <li
                  className="border-t border-border pt-3 first:border-t-0 first:pt-0"
                  key={candidate.id}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        candidate.status === "approved" ? "success" : "outline"
                      }
                    >
                      {reviewLabel(candidate.status)}
                    </Badge>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={candidate.reviewedAt}
                    >
                      {new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(candidate.reviewedAt))}
                    </time>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {candidate.content}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-control border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No decisions yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
