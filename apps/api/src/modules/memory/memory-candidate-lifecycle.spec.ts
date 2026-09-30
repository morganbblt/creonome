import { describe, expect, it } from "vitest";
import {
  computeLifecycleTransitions,
  findSupersededCandidateIds,
  MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD,
  MEMORY_CANDIDATE_EXPIRY_DAYS,
  memoryCandidateTextSimilarity,
  normalizeMemoryCandidateContent,
  type LifecycleCandidate,
} from "./memory-candidate-lifecycle.js";

const now = new Date("2026-09-30T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function candidate(
  id: string,
  overrides: Partial<LifecycleCandidate> = {},
): LifecycleCandidate {
  return {
    id,
    scope: "creator",
    content: "Never use fake urgency.",
    status: "pending",
    createdAt: new Date(now.getTime() - DAY_MS),
    ...overrides,
  };
}

describe("normalizeMemoryCandidateContent", () => {
  it("case-folds, strips diacritics and punctuation, and collapses whitespace", () => {
    expect(
      normalizeMemoryCandidateContent("  Évite   l'URGENCE, déjà!  "),
    ).toBe("evite l urgence deja");
  });

  it("treats trivially different wordings of the same proposal as equal", () => {
    expect(normalizeMemoryCandidateContent("Never use fake urgency.")).toBe(
      normalizeMemoryCandidateContent("never use fake   urgency"),
    );
  });
});

describe("memoryCandidateTextSimilarity", () => {
  it("returns 1 for identical token sets and 0 when nothing is shared", () => {
    expect(memoryCandidateTextSimilarity("a b c", "c b a")).toBe(1);
    expect(memoryCandidateTextSimilarity("a b", "c d")).toBe(0);
  });

  it("returns 0 when either side is empty", () => {
    expect(memoryCandidateTextSimilarity("", "a b")).toBe(0);
  });

  it("computes Jaccard similarity over tokens", () => {
    // {a,b,c} vs {b,c,d}: 2 shared / 4 total
    expect(memoryCandidateTextSimilarity("a b c", "b c d")).toBe(0.5);
  });
});

describe("computeLifecycleTransitions", () => {
  it("auto-accepts the proposal that reaches the threshold, not the earlier ones", () => {
    const candidates = Array.from(
      { length: MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD },
      (_, index) => candidate(`c${index}`),
    );

    expect(computeLifecycleTransitions(candidates, now)).toEqual([
      {
        id: `c${MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD - 1}`,
        nextStatus: "auto_accepted",
      },
    ]);
  });

  it("counts already-decided non-rejected proposals toward the streak", () => {
    const transitions = computeLifecycleTransitions(
      [
        candidate("approved", { status: "approved" }),
        candidate("expired", { status: "expired" }),
        candidate("pending"),
      ],
      now,
    );

    expect(transitions).toEqual([
      { id: "pending", nextStatus: "auto_accepted" },
    ]);
  });

  it("resets the streak after a rejection of the same normalized preference", () => {
    const transitions = computeLifecycleTransitions(
      [
        candidate("c1"),
        candidate("c2"),
        candidate("rejected", { status: "rejected" }),
        candidate("c3"),
      ],
      now,
    );

    expect(transitions).toEqual([]);
  });

  it("keeps streaks separate per scope", () => {
    const transitions = computeLifecycleTransitions(
      [
        candidate("c1", { scope: "creator" }),
        candidate("c2", { scope: "project" }),
        candidate("c3", { scope: "creator" }),
      ],
      now,
    );

    expect(transitions).toEqual([]);
  });

  it("expires a pending candidate older than the expiry window", () => {
    const stale = new Date(
      now.getTime() - (MEMORY_CANDIDATE_EXPIRY_DAYS + 1) * DAY_MS,
    );
    const fresh = new Date(
      now.getTime() - (MEMORY_CANDIDATE_EXPIRY_DAYS - 1) * DAY_MS,
    );

    expect(
      computeLifecycleTransitions(
        [
          candidate("stale", { createdAt: stale, content: "A" }),
          candidate("fresh", { createdAt: fresh, content: "B" }),
        ],
        now,
      ),
    ).toEqual([{ id: "stale", nextStatus: "expired" }]);
  });

  it("prefers auto-accept over expiry when both apply", () => {
    const stale = new Date(
      now.getTime() - (MEMORY_CANDIDATE_EXPIRY_DAYS + 1) * DAY_MS,
    );
    const candidates = Array.from(
      { length: MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD },
      (_, index) =>
        candidate(`c${index}`, { status: "approved", createdAt: stale }),
    );
    candidates[candidates.length - 1] = candidate("last", { createdAt: stale });

    expect(computeLifecycleTransitions(candidates, now)).toEqual([
      { id: "last", nextStatus: "auto_accepted" },
    ]);
  });

  it("never transitions a candidate that is not pending", () => {
    const stale = new Date(
      now.getTime() - (MEMORY_CANDIDATE_EXPIRY_DAYS + 1) * DAY_MS,
    );

    expect(
      computeLifecycleTransitions(
        [candidate("approved", { status: "approved", createdAt: stale })],
        now,
      ),
    ).toEqual([]);
  });
});

describe("findSupersededCandidateIds", () => {
  it("supersedes a sufficiently similar older candidate in scope", () => {
    expect(
      findSupersededCandidateIds(
        { id: "new", content: "Always film in a warm studio light setup" },
        [{ id: "old", content: "Always film in a cold studio light setup" }],
      ),
    ).toEqual(["old"]);
  });

  it("does not treat an exact duplicate as a replacement", () => {
    expect(
      findSupersededCandidateIds(
        { id: "new", content: "Never use fake urgency." },
        [{ id: "old", content: "never use fake urgency" }],
      ),
    ).toEqual([]);
  });

  it("ignores unrelated candidates and the new candidate itself", () => {
    expect(
      findSupersededCandidateIds(
        { id: "new", content: "Always film in a warm studio light setup" },
        [
          { id: "new", content: "Always film in a warm studio light setup" },
          { id: "other", content: "Keep captions under ten words" },
        ],
      ),
    ).toEqual([]);
  });
});
