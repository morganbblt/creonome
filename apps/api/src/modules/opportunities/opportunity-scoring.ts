/**
 * Deterministic, auditable opportunity sub-score formula.
 *
 * -------------------------------------------------------------------------
 * THE BIBLE FORMULA
 * -------------------------------------------------------------------------
 * The product spec ("the bible") defines opportunity quality as a weighted
 * blend of seven factors, minus a saturation/risk penalty:
 *
 *   22% momentum                 (is the underlying trend building?)
 *   24% Creator DNA fit          (does it match the creator's voice?)
 *   14% novelty                  (is it different from what came before?)
 *   12% retention potential      (will it hold an audience once it lands?)
 *   10% cross-sector portability (does the format travel beyond one niche?)
 *   10% feasibility              (can it actually be produced?)
 *    8% evidence quality         (how much can we trust the inputs?)
 *  ---
 *  100%
 *
 * The `opportunities` table only has four sub-score columns
 * (score_momentum, score_dna_fit, score_novelty, score_feasibility) — there
 * is no dedicated column for retention, portability or evidence quality.
 * Rather than add a migration for three more columns that would sit mostly
 * empty, each of those three factors is folded into the existing column it
 * is most causally related to, preserving its exact bible weight:
 *
 *   - retention potential (12%)      -> folded into MOMENTUM
 *     Rationale: retention is primarily a function of how early/durable the
 *     underlying trend is (an emerging trend still has runway to hold
 *     attention; a saturated one does not), which is the same lifecycle
 *     data the momentum column already reads.
 *
 *   - cross-sector portability (10%) -> folded into NOVELTY
 *     Rationale: a concept is "portable" to the extent its vocabulary is
 *     not locked to this one creator's fixed niche language — which is the
 *     same token-overlap machinery novelty already uses (just measured
 *     against Creator DNA vocabulary instead of past opportunities).
 *
 *   - evidence quality (8%)          -> split across MOMENTUM and DNA FIT
 *     Rationale: evidence quality is not one thing — it is "how fresh is
 *     the trend evidence" (momentum) and "how confident is the DNA trait
 *     extraction" (DNA fit). It is split between the two in proportion to
 *     their original bible weights (22:24), i.e. momentum gets 4/28 of the
 *     8% and DNA fit gets the remaining 4/28... rounded to a clean 4%/4%
 *     split since the two base weights are close enough that an even split
 *     is materially identical and far easier to audit.
 *
 * The resulting per-column weights used by {@link OPPORTUNITY_SCORE_WEIGHTS}
 * are therefore:
 *
 *   scoreMomentum    = 22% (momentum)     + 12% (retention) + 4% (evidence) = 38%
 *   scoreDnaFit      = 24% (dna fit)                        + 4% (evidence) = 28%
 *   scoreNovelty     = 14% (novelty)      + 10% (portability)               = 24%
 *   scoreFeasibility = 10% (feasibility)                                    = 10%
 *                                                                          ----
 *                                                                           100%
 *
 * Each column is itself computed from real signals (never copied from the
 * LLM's single aggregate score):
 *
 *   scoreMomentum:    trend_clusters.momentum_score, adjusted by lifecycle
 *                      stage (retention proxy) and how recently the signal
 *                      was last observed (evidence-quality proxy). Falls
 *                      back to a documented neutral baseline when no
 *                      normalized trend signal is attached.
 *
 *   scoreDnaFit:       token overlap between the concept's title/pitch and
 *                      the workspace's non-boundary Creator DNA traits
 *                      (voice, visual, music, story, audience, ...),
 *                      blended with the average extraction confidence of
 *                      those traits (evidence-quality proxy).
 *
 *   scoreNovelty:      100 minus the strongest text-similarity match
 *                      against the workspace's currently active
 *                      opportunities (shared topic/wording), blended with
 *                      a portability score measuring how much of the
 *                      concept's vocabulary lives *outside* the creator's
 *                      fixed DNA vocabulary (i.e. how little the idea
 *                      depends on this one creator's specific niche).
 *
 *   scoreFeasibility:  100 minus a penalty for every production-constraint
 *                      boundary trait (shooting time, face-on-camera,
 *                      budget/equipment, ...) whose own vocabulary overlaps
 *                      with the concept's vocabulary — i.e. the concept
 *                      appears to run into a constraint the creator has
 *                      stated. Falls back to a documented neutral baseline
 *                      when no production-constraint boundary is on file.
 *
 * scoreOverall is then the weighted sum of the four columns above, minus an
 * explicit saturation/risk penalty when the attached trend signal is
 * "declining" or "saturated" (the bible's "minus saturation/risk
 * penalties" clause) — this is on top of (not instead of) the softer
 * lifecycle adjustment already folded into momentum, because a saturated
 * trend is not just "somewhat weaker momentum", it is a standalone risk to
 * the whole bet.
 *
 * All sub-scores and the overall score are integers clamped to [0, 100] to
 * satisfy the `opportunities_scores_check` database constraint.
 */

export type OpportunityScoringConcept = {
  title: string;
  pitch: string;
};

export type OpportunityScoringTrend = {
  momentumScore: number;
  lifecycle: string;
  lastSeenAt: Date;
};

export type OpportunityScoringDnaTrait = {
  category: string;
  label: string;
  value: string;
  confidence: number | null;
};

export type OpportunityScoringRecent = {
  title: string;
  pitch: string;
};

export type OpportunitySubScores = {
  momentum: number;
  dnaFit: number;
  novelty: number;
  feasibility: number;
  overall: number;
};

export type ComputeOpportunitySubScoresInput = {
  concept: OpportunityScoringConcept;
  trend: OpportunityScoringTrend | null;
  dnaTraits: OpportunityScoringDnaTrait[];
  recentOpportunities: OpportunityScoringRecent[];
  /** Injectable clock for deterministic tests; defaults to `new Date()`. */
  now?: Date;
};

/** Per-column weights used to combine the four sub-scores into `overall`. */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  momentum: 0.38,
  dnaFit: 0.28,
  novelty: 0.24,
  feasibility: 0.1,
} as const;

/**
 * Within-column split of the folded-in bible factors (see file header).
 * Each momentum sub-component is first normalized to a 0-100 score, then
 * combined as a weighted average using these shares (they sum to 1).
 */
const MOMENTUM_DIRECT_SHARE = 22 / 38;
const MOMENTUM_RETENTION_SHARE = 12 / 38;
const MOMENTUM_EVIDENCE_SHARE = 4 / 38;

const DNA_FIT_SIMILARITY_SHARE = 24 / 28;
const DNA_FIT_EVIDENCE_SHARE = 4 / 28;

const NOVELTY_VS_RECENT_SHARE = 14 / 24;
const NOVELTY_PORTABILITY_SHARE = 10 / 24;

const NEUTRAL_MOMENTUM_BASELINE = 50;
const NO_HISTORY_NOVELTY_BASELINE = 75;
const NO_CONSTRAINT_FEASIBILITY_BASELINE = 75;
const DEFAULT_TRAIT_CONFIDENCE = 0.6;
const FEASIBILITY_CONFLICT_BUDGET = 60;
const FEASIBILITY_FLOOR = 15;

/**
 * Retention-potential proxy (0-100) per trend lifecycle stage: an emerging
 * or still-growing trend has runway left to hold an audience, a saturated
 * or fading one does not. Unknown/unrecognized lifecycle strings fall back
 * to a neutral 50.
 */
const LIFECYCLE_RETENTION_SCORE: Record<string, number> = {
  emerging: 85,
  growing: 95,
  peaking: 70,
  plateauing: 50,
  declining: 25,
  saturated: 10,
  fading: 15,
};

const SATURATION_RISK_PENALTY: Record<string, number> = {
  declining: 6,
  saturated: 10,
};

/** Keywords that mark a "boundary" DNA trait as a production constraint. */
const PRODUCTION_CONSTRAINT_KEYWORDS = [
  "budget",
  "shoot",
  "shooting",
  "camera",
  "face",
  "time",
  "schedule",
  "equipment",
  "location",
  "crew",
  "cost",
  "expensive",
  "gear",
  "studio",
  "daylight",
  "travel",
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "one",
  "your",
  "our",
  "their",
  "into",
  "onto",
  "from",
  "than",
  "then",
  "over",
  "under",
  "without",
  "while",
  "when",
  "just",
  "very",
  "each",
  "then",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function scoreMomentum(
  trend: OpportunityScoringTrend | null,
  now: Date,
): number {
  if (!trend) {
    // No normalized trend signal is attached: there is no real momentum,
    // retention or evidence data to read, so we report a documented
    // neutral baseline instead of guessing.
    return NEUTRAL_MOMENTUM_BASELINE;
  }
  const directScore = clamp(trend.momentumScore, 0, 100);
  const retentionScore =
    LIFECYCLE_RETENTION_SCORE[trend.lifecycle] ?? NEUTRAL_MOMENTUM_BASELINE;
  const recencyDays = Math.max(
    0,
    (now.getTime() - trend.lastSeenAt.getTime()) / 86_400_000,
  );
  // Full evidence credit for a signal observed in the last 3 days, decaying
  // to zero by ~day 33 (documented evidence-quality proxy).
  const evidenceScore = clamp(100 - recencyDays * 3, 0, 100);
  return clamp(
    Math.round(
      directScore * MOMENTUM_DIRECT_SHARE +
        retentionScore * MOMENTUM_RETENTION_SHARE +
        evidenceScore * MOMENTUM_EVIDENCE_SHARE,
    ),
    0,
    100,
  );
}

function scoreDnaFit(
  conceptTokens: Set<string>,
  dnaTokens: Set<string>,
  fitTraits: OpportunityScoringDnaTrait[],
): number {
  const similarity = jaccardSimilarity(conceptTokens, dnaTokens);
  const confidenceValues = fitTraits.map(
    (trait) => trait.confidence ?? DEFAULT_TRAIT_CONFIDENCE,
  );
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) /
      confidenceValues.length
    : DEFAULT_TRAIT_CONFIDENCE;
  return clamp(
    Math.round(
      similarity * 100 * DNA_FIT_SIMILARITY_SHARE +
        averageConfidence * 100 * DNA_FIT_EVIDENCE_SHARE,
    ),
    0,
    100,
  );
}

function scoreNovelty(
  conceptTokens: Set<string>,
  dnaTokens: Set<string>,
  recentOpportunities: OpportunityScoringRecent[],
): number {
  let vsRecent: number;
  if (recentOpportunities.length === 0) {
    // Nothing to compare against yet: assume above-average novelty rather
    // than penalizing an empty workspace.
    vsRecent = NO_HISTORY_NOVELTY_BASELINE;
  } else {
    const maxSimilarity = Math.max(
      ...recentOpportunities.map((recent) =>
        jaccardSimilarity(
          conceptTokens,
          tokenSet(`${recent.title} ${recent.pitch}`),
        ),
      ),
    );
    vsRecent = clamp(Math.round(100 - maxSimilarity * 100), 0, 100);
  }
  const portableTokenCount = [...conceptTokens].filter(
    (token) => !dnaTokens.has(token),
  ).length;
  const portabilityRatio = conceptTokens.size
    ? portableTokenCount / conceptTokens.size
    : 0;
  const portability = portabilityRatio * 100;
  return clamp(
    Math.round(
      vsRecent * NOVELTY_VS_RECENT_SHARE +
        portability * NOVELTY_PORTABILITY_SHARE,
    ),
    0,
    100,
  );
}

function scoreFeasibility(
  conceptTokens: Set<string>,
  dnaTraits: OpportunityScoringDnaTrait[],
): number {
  const boundaries = dnaTraits.filter((trait) => trait.category === "boundary");
  const productionBoundaries = boundaries.filter((trait) =>
    containsAnyKeyword(
      `${trait.label} ${trait.value}`,
      PRODUCTION_CONSTRAINT_KEYWORDS,
    ),
  );
  if (productionBoundaries.length === 0) {
    // No known production constraint on file: assume solidly feasible
    // without claiming certainty.
    return NO_CONSTRAINT_FEASIBILITY_BASELINE;
  }
  const conflicts = productionBoundaries.filter((trait) => {
    const boundaryTokens = tokenSet(`${trait.label} ${trait.value}`);
    return jaccardSimilarity(conceptTokens, boundaryTokens) > 0;
  }).length;
  const penaltyPerConflict = Math.ceil(
    FEASIBILITY_CONFLICT_BUDGET / productionBoundaries.length,
  );
  return clamp(100 - conflicts * penaltyPerConflict, FEASIBILITY_FLOOR, 100);
}

function computeOverall(
  subScores: Omit<OpportunitySubScores, "overall">,
  trend: OpportunityScoringTrend | null,
): number {
  const weighted =
    subScores.momentum * OPPORTUNITY_SCORE_WEIGHTS.momentum +
    subScores.dnaFit * OPPORTUNITY_SCORE_WEIGHTS.dnaFit +
    subScores.novelty * OPPORTUNITY_SCORE_WEIGHTS.novelty +
    subScores.feasibility * OPPORTUNITY_SCORE_WEIGHTS.feasibility;
  const riskPenalty = trend
    ? (SATURATION_RISK_PENALTY[trend.lifecycle] ?? 0)
    : 0;
  return clamp(Math.round(weighted - riskPenalty), 0, 100);
}

/**
 * Computes all four opportunity sub-scores plus the weighted overall score
 * from real, available signals. See the file header for the exact formula
 * and how the bible's seven factors map onto the four DB columns.
 */
export function computeOpportunitySubScores(
  input: ComputeOpportunitySubScoresInput,
): OpportunitySubScores {
  const now = input.now ?? new Date();
  const conceptTokens = tokenSet(
    `${input.concept.title} ${input.concept.pitch}`,
  );
  const fitTraits = input.dnaTraits.filter(
    (trait) => trait.category !== "boundary",
  );
  const dnaTokens = tokenSet(
    fitTraits.map((trait) => `${trait.label} ${trait.value}`).join(" "),
  );

  const momentum = scoreMomentum(input.trend, now);
  const dnaFit = scoreDnaFit(conceptTokens, dnaTokens, fitTraits);
  const novelty = scoreNovelty(
    conceptTokens,
    dnaTokens,
    input.recentOpportunities,
  );
  const feasibility = scoreFeasibility(conceptTokens, input.dnaTraits);
  const overall = computeOverall(
    { momentum, dnaFit, novelty, feasibility },
    input.trend,
  );

  return { momentum, dnaFit, novelty, feasibility, overall };
}
