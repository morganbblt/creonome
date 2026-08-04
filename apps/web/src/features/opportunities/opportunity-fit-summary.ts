import type { OpportunitySubScores } from "@creonome/contracts";

/**
 * Turns the four independently-computed opportunity sub-scores (see
 * apps/api/src/modules/opportunities/opportunity-scoring.ts for how each one
 * is derived from real signals) into display-ready breakdown rows and a
 * plain-language summary sentence.
 *
 * All text here is generated from the actual sub-score values passed in —
 * nothing is hardcoded per-opportunity copy. Different inputs produce
 * different labels, tones and sentences.
 */

export type SubScoreDimension =
  "momentum" | "dnaFit" | "novelty" | "feasibility";

export type SubScoreTone = "strong" | "solid" | "limited";

const DIMENSION_ORDER: SubScoreDimension[] = [
  "momentum",
  "dnaFit",
  "novelty",
  "feasibility",
];

const DIMENSION_LABEL: Record<SubScoreDimension, string> = {
  momentum: "Momentum",
  dnaFit: "Creator DNA fit",
  novelty: "Novelty",
  feasibility: "Feasibility",
};

/** >=80 reads as a genuine strength, <60 reads as a real caveat. */
const STRONG_THRESHOLD = 80;
const LIMITED_THRESHOLD = 60;

const STRONG_REASON: Record<SubScoreDimension, string> = {
  momentum: "the underlying trend is still building",
  dnaFit: "the concept closely matches your established voice",
  novelty: "it stands apart from your recent opportunities",
  feasibility: "it fits your usual production constraints",
};

const LIMITED_REASON: Record<SubScoreDimension, string> = {
  momentum: "the underlying trend has little runway left",
  dnaFit: "the concept stretches beyond your established voice",
  novelty: "it echoes ideas you've already explored recently",
  feasibility: "it runs into one or more of your stated production constraints",
};

export function toneForScore(score: number): SubScoreTone {
  if (score >= STRONG_THRESHOLD) {
    return "strong";
  }
  if (score >= LIMITED_THRESHOLD) {
    return "solid";
  }
  return "limited";
}

export type SubScoreBreakdownItem = {
  dimension: SubScoreDimension;
  label: string;
  value: number;
  tone: SubScoreTone;
};

/** The four sub-scores in a fixed, documented display order. */
export function buildSubScoreBreakdown(
  subScores: OpportunitySubScores,
): SubScoreBreakdownItem[] {
  return DIMENSION_ORDER.map((dimension) => {
    const value = subScores[dimension];
    return {
      dimension,
      label: DIMENSION_LABEL[dimension],
      value,
      tone: toneForScore(value),
    };
  });
}

function lowerFirst(text: string): string {
  return text.length ? text[0]!.toLowerCase() + text.slice(1) : text;
}

/**
 * One sentence naming the standout strength and, when there is a genuine
 * gap, the standout caveat — e.g. "Momentum is strong (88/100) but
 * feasibility is limited (42/100) because it runs into one or more of your
 * stated production constraints."
 */
export function summarizeOpportunityFit(
  subScores: OpportunitySubScores,
): string {
  const breakdown = buildSubScoreBreakdown(subScores);
  const strongest = [...breakdown].sort((a, b) => b.value - a.value)[0]!;
  const weakest = [...breakdown].sort((a, b) => a.value - b.value)[0]!;

  if (strongest.dimension === weakest.dimension) {
    return `${strongest.label} is the standout signal at ${strongest.value}/100.`;
  }
  if (strongest.tone === "strong" && weakest.tone === "limited") {
    return `${strongest.label} is strong (${strongest.value}/100), but ${lowerFirst(
      weakest.label,
    )} is limited (${weakest.value}/100) because ${LIMITED_REASON[weakest.dimension]}.`;
  }
  if (strongest.tone === "strong") {
    return `${strongest.label} is strong (${strongest.value}/100) because ${STRONG_REASON[strongest.dimension]}.`;
  }
  if (weakest.tone === "limited") {
    return `${weakest.label} is limited (${weakest.value}/100) because ${LIMITED_REASON[weakest.dimension]}.`;
  }
  return `All four signals are moderate, with ${lowerFirst(
    strongest.label,
  )} narrowly ahead at ${strongest.value}/100.`;
}

/** Per-dimension positive callouts, strongest first. Empty when none qualify. */
export function listOpportunityStrengths(
  subScores: OpportunitySubScores,
): string[] {
  return buildSubScoreBreakdown(subScores)
    .filter((item) => item.tone === "strong")
    .sort((a, b) => b.value - a.value)
    .map(
      (item) =>
        `${item.label} is strong (${item.value}/100) — ${STRONG_REASON[item.dimension]}.`,
    );
}

/** Per-dimension caveats, weakest first. Empty when none qualify. */
export function listOpportunityCaveats(
  subScores: OpportunitySubScores,
): string[] {
  return buildSubScoreBreakdown(subScores)
    .filter((item) => item.tone === "limited")
    .sort((a, b) => a.value - b.value)
    .map(
      (item) =>
        `${item.label} is limited (${item.value}/100) — ${LIMITED_REASON[item.dimension]}.`,
    );
}
