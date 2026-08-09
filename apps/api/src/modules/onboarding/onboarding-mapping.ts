import type {
  DnaTraitLayer,
  OnboardingCalibrationResponseValue,
  OnboardingProfile,
  OnboardingStatus,
  OnboardingStep,
} from "@creonome/contracts";

/**
 * The structured type of a "forbidden" boundary entry (Creator DNA bible
 * §11.1). Onboarding only ever collects free-text boundary strings, so this
 * is derived heuristically from the *shape* of the phrase rather than true
 * entity extraction -- see {@link classifyBoundary}.
 */
export type DnaTraitBoundaryType = "topic" | "person" | "word" | "other";

export type DnaTraitInput = {
  position: number;
  category: string;
  label: string;
  value: string;
  confidence: string;
  layer: DnaTraitLayer;
  evidence: {
    source: "onboarding";
    provenance: "observed" | "declared";
    boundaryType?: DnaTraitBoundaryType;
  };
};

export function deriveOnboardingStep(
  status: OnboardingStatus,
  assetCount: number,
  hasProfile: boolean,
): OnboardingStep {
  if (status === "complete") return "complete";
  if (hasProfile) return "profile";
  if (assetCount > 0) return "upload";
  return "source";
}

const BOUNDARY_NEGATION_PREFIXES = [
  "no ",
  "never ",
  "don't ",
  "do not ",
  "avoid ",
  "without ",
  "not ",
];

/**
 * Classifies a free-text creator boundary into one of the structured
 * "forbidden" entry types the product surfaces (banned topic / unauthorized
 * person / banned word / other). This is a heuristic over the *shape* of
 * the phrase -- not an NLP entity extractor -- since onboarding only ever
 * collects a flat list of boundary strings:
 *
 *   - a single token                    -> "word"    (e.g. "Politics")
 *   - a short Title Case phrase         -> "person"  (proxy for named
 *     entities: an unauthorized person or a specific brand/sponsor named
 *     by name, e.g. "Jane Doe", "Acme Cola")
 *   - anything else                     -> "topic"   (e.g. "alcohol brand
 *     promotions")
 *   - empty after stripping negation    -> "other"
 */
export function classifyBoundary(boundaryValue: string): DnaTraitBoundaryType {
  const normalized = boundaryValue.trim().replace(/[.!?]+$/, "");
  let phrase = normalized;
  for (const prefix of BOUNDARY_NEGATION_PREFIXES) {
    if (normalized.toLowerCase().startsWith(prefix)) {
      phrase = normalized.slice(prefix.length).trim();
      break;
    }
  }
  if (!phrase) return "other";
  const tokens = phrase.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return "word";
  const isTitleCase = tokens.every((token) => /^[A-Z]/.test(token));
  if (isTitleCase && tokens.length <= 4) return "person";
  return "topic";
}

export function profileToTraitInputs(
  profile: OnboardingProfile,
  provenance: "observed" | "declared",
): DnaTraitInput[] {
  const baseEvidence = { source: "onboarding" as const, provenance };
  const confidence = provenance === "observed" ? "0.800" : "1.000";

  // Every non-boundary field reflects the creator's declared/observed
  // identity -- the layer is simply the onboarding provenance, promoted
  // from the previously evidence-only field to a first-class column.
  const identityTraits = [
    ...profile.disciplines.map((value, index) => ({
      category: "discipline",
      label: `Discipline ${index + 1}`,
      value,
    })),
    ...profile.genres.map((value, index) => ({
      category: "genre",
      label: `Genre ${index + 1}`,
      value,
    })),
    {
      category: "signature",
      label: "Creative signature",
      value: profile.creativeSignature,
    },
    ...profile.themes.map((value, index) => ({
      category: "theme",
      label: `Theme ${index + 1}`,
      value,
    })),
    {
      category: "audience",
      label: "Target audience",
      value: profile.targetAudience,
    },
  ].map((trait) => ({
    ...trait,
    confidence,
    layer: provenance as DnaTraitLayer,
    evidence: baseEvidence,
  }));

  // Boundaries are hard constraints regardless of whether they were
  // captured on the in-progress draft or the confirmed profile -- a
  // creator boundary is never merely "observed", it must always be
  // enforced. This is the sole layer QualityGateService treats as a
  // rejection-worthy violation.
  const forbiddenTraits = profile.boundaries.map((value, index) => ({
    category: "boundary",
    label: `Boundary ${index + 1}`,
    value,
    confidence,
    layer: "forbidden" as DnaTraitLayer,
    evidence: { ...baseEvidence, boundaryType: classifyBoundary(value) },
  }));

  return [...identityTraits, ...forbiddenTraits].map((trait, index) => ({
    ...trait,
    position: index + 1,
  }));
}

/**
 * Bible screen #17 calibration: heuristic confidence (0..1, written as a
 * fixed 3-decimal string to match the memory_candidates numeric(4,3)
 * column) that a calibration response reflects a durable creator
 * preference. Mirrors the flat per-source-type heuristic
 * neon-opportunities.repository.ts already uses for explicit feedback
 * (FEEDBACK_MEMORY_CANDIDATE_CONFIDENCE) -- no scoring model exists yet.
 * "feels_like_me" and "not_for_me" are unambiguous creator signal (same
 * confidence as an explicit always_do/never_use); "future_direction" is a
 * softer, exploratory signal and gets a lower default.
 */
const CALIBRATION_RESPONSE_CONFIDENCE: Record<
  OnboardingCalibrationResponseValue,
  number
> = {
  feels_like_me: 0.65,
  future_direction: 0.5,
  not_for_me: 0.65,
};

const CALIBRATION_RESPONSE_COPY: Record<
  OnboardingCalibrationResponseValue,
  string
> = {
  feels_like_me: "feels like me",
  future_direction: "a future direction to explore",
  not_for_me: "not for me",
};

export function calibrationResponseConfidence(
  response: OnboardingCalibrationResponseValue,
): string {
  return CALIBRATION_RESPONSE_CONFIDENCE[response].toFixed(3);
}

export function calibrationResponseContent(input: {
  title: string;
  description: string;
  response: OnboardingCalibrationResponseValue;
}): string {
  return `Onboarding calibration: creator marked "${input.title}" as ${CALIBRATION_RESPONSE_COPY[input.response]}. Concept: ${input.description}`;
}
