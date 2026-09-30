/**
 * Pure, DB-free helpers implementing the memory candidate lifecycle from
 * bible §10.4: proposed -> {approved | rejected | auto_accepted | expired},
 * plus approved/auto_accepted -> superseded. Kept separate from
 * memory-candidates.service.ts so the thresholds and heuristics can be unit
 * tested without a database or NestJS DI container.
 *
 * Not wired yet: nothing calls these helpers so far. The references to
 * memory-candidates.service.ts below describe the intended integration
 * (lazy sweep on list, supersede on approve), which must ship together
 * with widening the MemoryCandidate history contract in @creonome/contracts.
 */

/**
 * How many times an equivalent preference (same scope, near-identical
 * normalized content) must be *proposed* in a row -- without an
 * intervening rejection -- before a new proposal is auto-accepted instead
 * of waiting for a human review. Bible §10.4 only says "confirmations
 * répétées"; 3 is chosen deliberately higher than
 * LEARNED_TRAIT_PROMOTION_THRESHOLD (2, in memory-candidates.service.ts)
 * because that threshold still requires a human to approve every single
 * occurrence -- auto-accepting *skips* review entirely, so it should need
 * one more confirmation than a mechanism that keeps a human in the loop.
 * 2 occurrences is common enough to be coincidence; 3 is a deliberate
 * pattern.
 */
export const MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD = 3;

/**
 * How long a "pending" candidate can sit unreviewed before it is treated
 * as stale and lazily swept to "expired" the next time candidates are
 * listed (see memory-candidates.service.ts -- there is no scheduled-job
 * mechanism in this codebase to expire it proactively). 30 days matches
 * the cadence of a monthly content-planning cycle: a suggestion tied to
 * one revision or one piece of feedback that nobody acted on in a month is
 * unlikely to still be relevant.
 */
export const MEMORY_CANDIDATE_EXPIRY_DAYS = 30;

const MEMORY_CANDIDATE_EXPIRY_MS =
  MEMORY_CANDIDATE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Minimum token-overlap (Jaccard similarity over normalized whitespace
 * tokens) between a newly approved/auto-accepted candidate and an older
 * approved/auto-accepted candidate in the same scope for the new one to be
 * considered a replacement of the old one. This is deliberately a coarse
 * "same subject" heuristic, not real contradiction detection (bible §10.4
 * only asks for "scope match + simple text similarity", not semantic
 * negation detection): two candidates that already share this much
 * vocabulary in the same scope are assumed to be about the same
 * preference, so the newer one wins. Exact duplicates (identical
 * normalized content) are excluded from this check -- those are treated as
 * reinforcement by the auto-accept streak below, not a contradiction.
 */
export const MEMORY_CANDIDATE_SUPERSEDE_SIMILARITY_THRESHOLD = 0.6;

/**
 * Normalizes memory candidate content for equivalence/similarity checks:
 * case-folds, strips diacritics and punctuation, and collapses whitespace.
 * This is intentionally simple (no stemming/lemmatization or language
 * detection) -- it only needs to recognize that "Never use fake urgency."
 * and "never use fake urgency" are the same proposal, not to understand
 * meaning.
 */
export function normalizeMemoryCandidateContent(content: string): string {
  return content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function tokenSet(normalizedContent: string): Set<string> {
  return new Set(normalizedContent.split(" ").filter(Boolean));
}

/**
 * Jaccard similarity (intersection over union) between the token sets of
 * two already-normalized strings. 0 when either side is empty.
 */
export function memoryCandidateTextSimilarity(
  normalizedA: string,
  normalizedB: string,
): number {
  const setA = tokenSet(normalizedA);
  const setB = tokenSet(normalizedB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * The subset of memory_candidates columns needed to compute lifecycle
 * transitions, ordered ascending by createdAt (oldest first) by the
 * caller -- the auto-accept streak and expiry checks both depend on
 * processing proposals in the order they happened.
 */
export type LifecycleCandidate = {
  id: string;
  scope: string;
  content: string;
  status: string;
  createdAt: Date;
};

export type LifecycleTransition = {
  id: string;
  nextStatus: "auto_accepted" | "expired";
};

/**
 * Computes which "pending" candidates should transition to "auto_accepted"
 * (repeated, unrejected proposal of an equivalent preference -- bible
 * §10.4) or "expired" (stale, unreviewed past
 * {@link MEMORY_CANDIDATE_EXPIRY_DAYS}), given every candidate for one
 * creator profile ordered ascending by createdAt.
 *
 * Streak rule: within a (scope, normalized content) group, walk proposals
 * in chronological order. Any non-"rejected" status (pending, approved,
 * auto_accepted, expired, superseded) counts as "not rejected" and keeps
 * the streak alive, since the candidate was still proposed and never
 * turned down; a "rejected" status resets the streak to 0 for that group.
 * Auto-accept is evaluated before expiry per candidate: a proposal that
 * reaches the threshold is auto-accepted even if it is also old enough to
 * have expired, since reaching the threshold is what should have happened
 * at proposal time.
 */
export function computeLifecycleTransitions(
  candidatesAscending: LifecycleCandidate[],
  now: Date,
): LifecycleTransition[] {
  const transitions: LifecycleTransition[] = [];
  const streaks = new Map<string, number>();
  const expiryCutoff = now.getTime() - MEMORY_CANDIDATE_EXPIRY_MS;

  for (const candidate of candidatesAscending) {
    const groupKey = `${candidate.scope}::${normalizeMemoryCandidateContent(candidate.content)}`;

    if (candidate.status === "rejected") {
      streaks.set(groupKey, 0);
      continue;
    }

    const streak = (streaks.get(groupKey) ?? 0) + 1;
    streaks.set(groupKey, streak);

    if (candidate.status !== "pending") continue;

    if (streak >= MEMORY_CANDIDATE_AUTO_ACCEPT_THRESHOLD) {
      transitions.push({ id: candidate.id, nextStatus: "auto_accepted" });
      continue;
    }

    if (candidate.createdAt.getTime() < expiryCutoff) {
      transitions.push({ id: candidate.id, nextStatus: "expired" });
    }
  }

  return transitions;
}

/**
 * Given a newly approved/auto-accepted candidate and the other currently
 * "approved"/"auto_accepted" candidates in the same scope, returns the ids
 * of older candidates that should be marked "superseded" -- same scope,
 * sufficiently similar wording (see
 * {@link MEMORY_CANDIDATE_SUPERSEDE_SIMILARITY_THRESHOLD}), but not an
 * exact duplicate of the new one (exact duplicates are reinforcement, not
 * a contradiction/replacement).
 */
export function findSupersededCandidateIds(
  newCandidate: { id: string; content: string },
  activeCandidatesInScope: { id: string; content: string }[],
): string[] {
  const newNormalized = normalizeMemoryCandidateContent(newCandidate.content);
  const superseded: string[] = [];

  for (const existing of activeCandidatesInScope) {
    if (existing.id === newCandidate.id) continue;
    const existingNormalized = normalizeMemoryCandidateContent(
      existing.content,
    );
    if (existingNormalized === newNormalized) continue;
    if (
      memoryCandidateTextSimilarity(newNormalized, existingNormalized) >=
      MEMORY_CANDIDATE_SUPERSEDE_SIMILARITY_THRESHOLD
    ) {
      superseded.push(existing.id);
    }
  }

  return superseded;
}
