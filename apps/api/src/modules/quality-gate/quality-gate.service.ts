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
  | "invalid_aspect_ratio";

export type QualityGateViolation = {
  code: QualityGateViolationCode;
  message: string;
};

export type QualityGateResult = {
  passed: boolean;
  violations: QualityGateViolation[];
};

export type QualityGateScriptInput = {
  hook: string;
  body: string;
  callToAction: string | null;
  caption: string | null;
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

    violations.push(
      ...(await this.boundaryViolations(
        creatorProfileId,
        joinText([
          script.hook,
          script.body,
          script.callToAction,
          script.caption,
        ]),
      )),
    );

    return { passed: violations.length === 0, violations };
  }

  async evaluateStoryboard(
    creatorProfileId: string,
    storyboard: QualityGateStoryboardInput,
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
    violations.push(...(await this.boundaryViolations(creatorProfileId, text)));

    return { passed: violations.length === 0, violations };
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
      violations.push(
        ...(await this.boundaryViolations(creatorProfileId, video.sourceText)),
      );
    }

    return { passed: violations.length === 0, violations };
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
      if (trait.category !== "boundary") continue;
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
}
