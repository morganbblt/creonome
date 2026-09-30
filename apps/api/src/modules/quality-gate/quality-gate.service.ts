import { Inject, Injectable } from "@nestjs/common";
import {
  CREATOR_DNA_REPOSITORY,
  type CreatorDnaRepository,
} from "../creator-dna/creator-dna.repository.js";

export type QualityGateViolationCode =
  | "forbidden_topic"
  | "missing_hook"
  | "missing_call_to_action"
  | "scene_count_out_of_range"
  | "duration_mismatch"
  | "invalid_aspect_ratio"
  | "possible_close_reproduction"
  | "unverified_claim"
  | "storyboard_orphan_scene"
  | "script_segment_without_scene";

export type QualityGateViolation = {
  code: QualityGateViolationCode;
  message: string;
};

export type QualityGateResult = {
  /** True when there is no blocking violation; warnings never fail it. */
  passed: boolean;
  /** Blocking findings: the generation must not be persisted. */
  violations: QualityGateViolation[];
  /**
   * Advisory findings from coarse lexical heuristics, surfaced for human
   * review but never failing the gate on their own (bible §20.8 "claims
   * signalés": flagged, not rejected).
   */
  warnings: QualityGateViolation[];
};

/**
 * Codes produced by keyword/bag-of-words heuristics. They have known
 * false positives (a hook like "you'll never believe this" matches
 * "never"), and a failed gate discards the generation and releases its
 * credits, so they are reported as warnings instead of blocking.
 */
const ADVISORY_VIOLATION_CODES: ReadonlySet<QualityGateViolationCode> = new Set(
  [
    "unverified_claim",
    "storyboard_orphan_scene",
    "script_segment_without_scene",
  ],
);

function toResult(findings: QualityGateViolation[]): QualityGateResult {
  const violations = findings.filter(
    ({ code }) => !ADVISORY_VIOLATION_CODES.has(code),
  );
  const warnings = findings.filter(({ code }) =>
    ADVISORY_VIOLATION_CODES.has(code),
  );
  return { passed: violations.length === 0, violations, warnings };
}

export type QualityGateScriptInput = {
  hook: string;
  body: string;
  callToAction: string | null;
  caption: string | null;
  /**
   * Trend/inspiration source text(s) the script was generated from, when
   * available (e.g. the normalized trend signal text or a creator
   * inspiration snippet). Optional and additive so existing callers that
   * don't have this text on hand keep working unchanged -- they simply
   * don't get the "possible_close_reproduction" check.
   */
  referenceTexts?: string[] | null;
};

export type QualityGateStoryboardScene = {
  heading: string;
  description: string;
  voiceover: string | null;
  onScreenText: string | null;
  durationSeconds: number | null;
};

export type QualityGateStoryboardInput = {
  durationSeconds: number | null;
  scenes: QualityGateStoryboardScene[];
};

export type QualityGateVideoInput = {
  width: number;
  height: number;
  /** Text (script/storyboard) that informed the render, if available. */
  sourceText?: string;
};

/**
 * Raised when generated content fails the pre-publish quality gate. Callers
 * must not persist the generation as "succeeded" when this is thrown — the
 * credit reservation should be released instead of committed.
 */
export class QualityGateRejectedError extends Error {
  constructor(readonly violations: QualityGateViolation[]) {
    super(
      `Quality gate rejected the generated content: ${violations
        .map((violation) => violation.code)
        .join(", ")}`,
    );
    this.name = "QualityGateRejectedError";
  }
}

const MIN_SCENE_COUNT = 3;
const MAX_SCENE_COUNT = 8;
const TARGET_ASPECT_RATIO = 9 / 16;
const ASPECT_RATIO_TOLERANCE = 0.02;

const NEGATION_PREFIXES = [
  "no ",
  "never ",
  "don't ",
  "do not ",
  "avoid ",
  "without ",
  "not ",
];

// Generic connector/meta words that show up in most boundary statements and
// would otherwise produce noisy false-positive matches.
const KEYWORD_STOPWORDS = new Set([
  "with",
  "that",
  "this",
  "from",
  "your",
  "their",
  "them",
  "into",
  "about",
  "content",
  "brand",
  "brands",
  "mention",
  "mentions",
  "related",
  "topic",
  "topics",
  "posts",
  "post",
  "video",
  "videos",
  "imitation",
]);

/**
 * Extracts the salient forbidden keyword(s) from a free-text creator DNA
 * boundary, e.g. "No alcohol brand promotions" -> ["alcohol", "promotions"].
 */
export function extractForbiddenKeywords(boundaryValue: string): string[] {
  const normalized = boundaryValue
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  let phrase = normalized;
  for (const prefix of NEGATION_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      phrase = normalized.slice(prefix.length).trim();
      break;
    }
  }
  return phrase
    .split(/[\s,/]+/)
    .map((word) => word.replace(/[^a-z0-9'-]/g, ""))
    .filter((word) => word.length >= 4 && !KEYWORD_STOPWORDS.has(word));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function joinText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");
}

/**
 * Splits free text into sentence-ish fragments on `.`/`!`/`?` followed by
 * whitespace, or on line breaks. Deliberately simple (no NLP sentence
 * boundary detection): the "reprise" and "unverified claim" checks below
 * operate per-fragment mostly to produce a readable, quotable message, so
 * false splits (e.g. on an abbreviation) just mean a slightly awkward
 * fragment gets compared/quoted -- it does not affect correctness.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = new Array<number>(b.length + 1);
  let currentRow = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) previousRow[j] = j;

  for (let i = 1; i <= a.length; i++) {
    currentRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1, // deletion
        currentRow[j - 1] + 1, // insertion
        previousRow[j - 1] + substitutionCost, // substitution
      );
    }
    [previousRow, currentRow] = [currentRow, previousRow];
  }
  return previousRow[b.length];
}

/**
 * Normalized Levenshtein similarity in [0, 1]: 1 means identical strings, 0
 * means they share nothing (edit distance equal to the longer string's
 * length). Dependency-free by design -- no external string-distance package
 * is pulled in for this.
 */
function normalizedSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}

/**
 * Below this length (characters) sentence-level similarity comparisons are
 * skipped for the "reprise" check: very short fragments ("Follow us.",
 * "Let's go.") sit at a high Levenshtein similarity to almost any other
 * short fragment and would produce noisy false positives without being
 * meaningful evidence of copying.
 */
const MIN_COMPARABLE_SENTENCE_LENGTH = 20;

/**
 * Normalized Levenshtein similarity threshold above which a generated
 * sentence is flagged as a possible close reproduction of a trend/
 * inspiration source sentence (bible §20.8 "absence de copie textuelle trop
 * proche", §8.4 "imitation trop proche"). 0.82 means at most ~18% of
 * characters differ -- enough to tolerate light paraphrasing/word swaps
 * while still catching near-verbatim copies. Chosen as a conservative
 * starting point; tune down if paraphrased copying is slipping through in
 * practice, or up if legitimately original scripts start getting flagged.
 */
const CLOSE_REPRODUCTION_SIMILARITY_THRESHOLD = 0.82;

/**
 * Word/phrase triggers for the "unverified_claim" check (bible §20.8
 * "claims signalés", §8.4 "claim non vérifié"). These are absolute or
 * guarantee-shaped words that are *always* flagged regardless of nearby
 * citations, because an absolute promise ("guaranteed", "always works") is
 * risky content for a creator to publish even when sourced. Kept bilingual
 * (FR/EN) since scripts may be generated in either language. This is
 * intentionally a coarse lexical heuristic, not fact-checking: it does not
 * determine whether a claim is true, only that it reads as the kind of
 * promise that should get a human's eyes before publish -- a known
 * trade-off is that rhetorical, non-promissory uses (e.g. a hook like
 * "you'll never believe this") can also match and will need a quick human
 * dismissal.
 */
const CLAIM_TRIGGER_WORDS = [
  "garanti",
  "garantie",
  "garantis",
  "garantit",
  "guaranteed",
  "guarantee",
  "toujours",
  "always",
  "jamais",
  "never",
];

/**
 * Any percentage figure in a sentence is flagged as an unverified claim
 * unless that same sentence also contains one of these citation/
 * attribution markers. This is a coarse same-sentence proximity heuristic:
 * it will not find a citation given in a different sentence, and it does
 * not verify the citation is real -- only that *some* sourcing language sits
 * next to the number.
 */
const CLAIM_CITATION_KEYWORDS = [
  "source",
  "sources",
  "étude",
  "etude",
  "study",
  "studies",
  "selon",
  "according to",
  "d'après",
  "d’après",
  "cité",
  "cite",
  "cites",
  "cited",
  "recherche",
  "research",
  "rapport",
  "report",
  "sourced",
  "données",
  "donnees",
  "data",
];

const PERCENTAGE_CLAIM_PATTERN = /\d+(?:[.,]\d+)?\s?%/;

/**
 * Common short function words (FR + EN) excluded from the script/storyboard
 * keyword-alignment check below so they don't register as "shared content"
 * between an unrelated scene and script segment just because both happen to
 * contain e.g. "with"/"avec".
 */
const CONSISTENCY_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "their",
  "them",
  "into",
  "about",
  "have",
  "will",
  "just",
  "then",
  "when",
  "what",
  "which",
  "while",
  "where",
  "there",
  "here",
  "been",
  "were",
  "was",
  "are",
  "its",
  "our",
  "out",
  "over",
  "under",
  "after",
  "before",
  "because",
  "like",
  "than",
  "also",
  "some",
  "more",
  "most",
  "very",
  "really",
  "much",
  "many",
  "only",
  "even",
  "still",
  "every",
  "each",
  "other",
  "another",
  "those",
  "these",
  "avec",
  "dans",
  "pour",
  "cette",
  "votre",
  "leur",
  "leurs",
  "depuis",
  "alors",
  "mais",
  "donc",
  "tout",
  "tous",
  "toute",
  "toutes",
  "comme",
  "plus",
  "très",
  "etre",
  "avoir",
  "cela",
  "ceci",
]);

/**
 * Extracts the lowercase, length->=4, non-stopword "content" words from a
 * fragment of text -- used as a lightweight bag-of-words signal for the
 * script/storyboard alignment check (block/keyword alignment, not a
 * semantic/embedding comparison).
 */
function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !CONSISTENCY_STOPWORDS.has(word)),
  );
}

function sharesSignificantWord(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  for (const word of a) {
    if (b.has(word)) return true;
  }
  return false;
}

/**
 * Runs the automated pre-publish content gate on generated scripts,
 * storyboards and videos. This is the last check before a generation is
 * persisted and marked "succeeded" — anything it rejects must instead
 * result in a released credit reservation.
 */
@Injectable()
export class QualityGateService {
  constructor(
    @Inject(CREATOR_DNA_REPOSITORY)
    private readonly creatorDna: CreatorDnaRepository,
  ) {}

  async evaluateScript(
    creatorProfileId: string,
    script: QualityGateScriptInput,
  ): Promise<QualityGateResult> {
    const violations: QualityGateViolation[] = [];

    if (!script.hook.trim()) {
      violations.push({
        code: "missing_hook",
        message: "The script is missing an opening hook.",
      });
    }
    if (!script.callToAction?.trim()) {
      violations.push({
        code: "missing_call_to_action",
        message: "The script is missing a call to action.",
      });
    }

    const combinedText = joinText([
      script.hook,
      script.body,
      script.callToAction,
      script.caption,
    ]);

    if (script.referenceTexts?.length) {
      violations.push(
        ...this.closeReproductionViolations(
          joinText([script.hook, script.body, script.callToAction]),
          script.referenceTexts,
        ),
      );
    }

    violations.push(...this.unverifiedClaimViolations(combinedText));

    violations.push(
      ...(await this.boundaryViolations(creatorProfileId, combinedText)),
    );

    return toResult(violations);
  }

  async evaluateStoryboard(
    creatorProfileId: string,
    storyboard: QualityGateStoryboardInput,
    script?: QualityGateScriptInput | null,
  ): Promise<QualityGateResult> {
    const violations: QualityGateViolation[] = [];

    if (
      storyboard.scenes.length < MIN_SCENE_COUNT ||
      storyboard.scenes.length > MAX_SCENE_COUNT
    ) {
      violations.push({
        code: "scene_count_out_of_range",
        message: `Storyboards must have between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT} scenes, found ${storyboard.scenes.length}.`,
      });
    }

    const sceneTotal = storyboard.scenes.reduce(
      (total, scene) => total + (scene.durationSeconds ?? 0),
      0,
    );
    if (
      storyboard.durationSeconds !== null &&
      sceneTotal !== storyboard.durationSeconds
    ) {
      violations.push({
        code: "duration_mismatch",
        message: `Scene durations (${sceneTotal}s) do not add up to the storyboard duration (${storyboard.durationSeconds}s).`,
      });
    }

    const text = joinText(
      storyboard.scenes.flatMap((scene) => [
        scene.heading,
        scene.description,
        scene.voiceover,
        scene.onScreenText,
      ]),
    );

    if (script) {
      violations.push(
        ...this.scriptStoryboardConsistencyViolations(script, storyboard),
      );
    }

    violations.push(...this.unverifiedClaimViolations(text));

    violations.push(...(await this.boundaryViolations(creatorProfileId, text)));

    return toResult(violations);
  }

  async evaluateVideo(
    creatorProfileId: string,
    video: QualityGateVideoInput,
  ): Promise<QualityGateResult> {
    const violations: QualityGateViolation[] = [];

    const ratio = video.height > 0 ? video.width / video.height : 0;
    if (
      video.width <= 0 ||
      video.height <= 0 ||
      Math.abs(ratio - TARGET_ASPECT_RATIO) > ASPECT_RATIO_TOLERANCE
    ) {
      violations.push({
        code: "invalid_aspect_ratio",
        message: `Video must be rendered in 9:16, received ${video.width}x${video.height}.`,
      });
    }

    if (video.sourceText) {
      violations.push(...this.unverifiedClaimViolations(video.sourceText));
      violations.push(
        ...(await this.boundaryViolations(creatorProfileId, video.sourceText)),
      );
    }

    return toResult(violations);
  }

  private async boundaryViolations(
    creatorProfileId: string,
    text: string,
  ): Promise<QualityGateViolation[]> {
    if (!text.trim()) return [];

    const dna = await this.creatorDna
      .getCurrent(creatorProfileId)
      .catch(() => null);
    if (!dna) return [];

    const normalizedText = text.toLowerCase();
    const violations: QualityGateViolation[] = [];
    for (const trait of dna.traits) {
      // Only the "forbidden" layer (Creator DNA bible §11.1) is enforced
      // here as a hard, rejection-worthy constraint. Historically this
      // checked `category === "boundary"` directly, which conflated "is a
      // boundary-shaped trait" with "is a non-negotiable constraint" --
      // every boundary-category trait created by onboarding is always
      // promoted to layer="forbidden" (see onboarding-mapping.ts), so this
      // is a strict generalization, not a behavior change for existing
      // data. It also means a "learned" avoidance pattern (a softer,
      // inferred signal -- see MemoryCandidatesService.approve) is
      // deliberately *not* enforced here even though it may share the same
      // "boundary"-like vocabulary; only an explicit forbidden entry is
      // treated as non-negotiable.
      if (trait.layer !== "forbidden") continue;
      const keywords = extractForbiddenKeywords(trait.value);
      const matched = keywords.find((keyword) =>
        new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(normalizedText),
      );
      if (matched) {
        violations.push({
          code: "forbidden_topic",
          message: `Generated content references "${matched}", which conflicts with the creator boundary "${trait.value}".`,
        });
      }
    }
    return violations;
  }

  /**
   * Flags generated sentences that read as a near-verbatim copy of a
   * trend/inspiration source sentence (bible §20.8 "absence de copie
   * textuelle trop proche"). Sentence-level, dependency-free normalized
   * Levenshtein similarity -- see `CLOSE_REPRODUCTION_SIMILARITY_THRESHOLD`
   * for the threshold rationale.
   */
  private closeReproductionViolations(
    generatedText: string,
    referenceTexts: string[],
  ): QualityGateViolation[] {
    const generatedSentences = splitSentences(generatedText);
    const referenceSentences = referenceTexts
      .filter((value): value is string => Boolean(value?.trim()))
      .flatMap((value) => splitSentences(value));
    if (generatedSentences.length === 0 || referenceSentences.length === 0) {
      return [];
    }

    const violations: QualityGateViolation[] = [];
    for (const generatedSentence of generatedSentences) {
      const normalizedGenerated = generatedSentence.toLowerCase();
      if (normalizedGenerated.length < MIN_COMPARABLE_SENTENCE_LENGTH) continue;

      let bestMatch: { sentence: string; similarity: number } | null = null;
      for (const referenceSentence of referenceSentences) {
        const normalizedReference = referenceSentence.toLowerCase();
        if (normalizedReference.length < MIN_COMPARABLE_SENTENCE_LENGTH) {
          continue;
        }

        const similarity = normalizedSimilarity(
          normalizedGenerated,
          normalizedReference,
        );
        if (
          similarity >= CLOSE_REPRODUCTION_SIMILARITY_THRESHOLD &&
          (!bestMatch || similarity > bestMatch.similarity)
        ) {
          bestMatch = { sentence: referenceSentence, similarity };
        }
      }

      if (bestMatch) {
        violations.push({
          code: "possible_close_reproduction",
          message: `The line "${generatedSentence}" is ${Math.round(
            bestMatch.similarity * 100,
          )}% similar to a reference/trend source sentence ("${bestMatch.sentence}") and may be too close a reproduction.`,
        });
      }
    }
    return violations;
  }

  /**
   * Flags sentences that read as an absolute promise ("guaranteed",
   * "toujours") or an unsourced percentage claim (bible §20.8 "claims
   * signalés", §8.4 "claim non vérifié"). See `CLAIM_TRIGGER_WORDS` and
   * `CLAIM_CITATION_KEYWORDS` for the exact patterns and their rationale.
   */
  private unverifiedClaimViolations(text: string): QualityGateViolation[] {
    if (!text.trim()) return [];

    const violations: QualityGateViolation[] = [];
    const seenSentences = new Set<string>();
    for (const sentence of splitSentences(text)) {
      const normalized = sentence.toLowerCase();
      if (seenSentences.has(normalized)) continue;

      const hasAbsoluteTrigger = CLAIM_TRIGGER_WORDS.some((word) =>
        new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(normalized),
      );
      const hasUnsourcedPercentage =
        PERCENTAGE_CLAIM_PATTERN.test(normalized) &&
        !CLAIM_CITATION_KEYWORDS.some((keyword) =>
          normalized.includes(keyword),
        );

      if (hasAbsoluteTrigger || hasUnsourcedPercentage) {
        seenSentences.add(normalized);
        violations.push({
          code: "unverified_claim",
          message: `The line "${sentence}" reads as an absolute or unsourced claim and should be reviewed or backed by a citation before publishing.`,
        });
      }
    }
    return violations;
  }

  /**
   * Checks that a storyboard's scenes line up with the script it was
   * generated from (bible §20.8 "cohérence entre script et storyboard"):
   * every narrative beat of the script (hook / each body sentence / CTA)
   * should be reflected in at least one scene, and every scene should trace
   * back to some part of the script. This is a simple bag-of-words
   * block-alignment heuristic (shared "content" keywords, see
   * `significantWords`), not a semantic/embedding-based comparison.
   */
  private scriptStoryboardConsistencyViolations(
    script: QualityGateScriptInput,
    storyboard: QualityGateStoryboardInput,
  ): QualityGateViolation[] {
    const violations: QualityGateViolation[] = [];

    const segments: Array<{ label: string; keywords: Set<string> }> = [];
    if (script.hook.trim()) {
      segments.push({ label: "hook", keywords: significantWords(script.hook) });
    }
    for (const sentence of splitSentences(script.body)) {
      const preview =
        sentence.length > 60 ? `${sentence.slice(0, 57)}...` : sentence;
      segments.push({
        label: `body segment ("${preview}")`,
        keywords: significantWords(sentence),
      });
    }
    if (script.callToAction?.trim()) {
      segments.push({
        label: "call to action",
        keywords: significantWords(script.callToAction),
      });
    }

    const sceneKeywordSets = storyboard.scenes.map((scene) =>
      significantWords(
        joinText([
          scene.heading,
          scene.description,
          scene.voiceover,
          scene.onScreenText,
        ]),
      ),
    );

    // No part of the script should be silently dropped from the
    // storyboard.
    for (const segment of segments) {
      if (segment.keywords.size === 0) continue; // nothing distinctive to align on
      const isReflected = sceneKeywordSets.some((sceneWords) =>
        sharesSignificantWord(segment.keywords, sceneWords),
      );
      if (!isReflected) {
        violations.push({
          code: "script_segment_without_scene",
          message: `The script's ${segment.label} does not appear to be reflected in any storyboard scene.`,
        });
      }
    }

    // No scene should be an orphan invented outside the approved script.
    const allScriptKeywords = new Set<string>();
    for (const segment of segments) {
      for (const word of segment.keywords) allScriptKeywords.add(word);
    }
    storyboard.scenes.forEach((scene, index) => {
      const sceneWords = sceneKeywordSets[index];
      if (sceneWords.size === 0) return; // nothing distinctive to align on
      if (!sharesSignificantWord(sceneWords, allScriptKeywords)) {
        violations.push({
          code: "storyboard_orphan_scene",
          message: `Scene ${index + 1} ("${scene.heading}") does not appear to correspond to any part of the script.`,
        });
      }
    });

    return violations;
  }
}
