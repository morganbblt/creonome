import { BadRequestException } from "@nestjs/common";
import type {
  GeneratedStoryboard,
  GeneratedStoryboardScene,
  ProjectStoryboardRecord,
  ProjectVideoRecord,
} from "./projects.repository.js";
import type { GeneratedVideoArtifact } from "./video/video-provider.js";

/**
 * Field locking (bible §9.6) for `/projects/:id/upgrade` regenerations.
 * `UpgradeProjectDto.lockedFields` only bounds the *shape* of the array
 * (packages/contracts); this module is the single source of truth for
 * which field names are actually legal per target level, for diffing a
 * regenerated artifact against the previous one, and for building the
 * prompt lines that ask the model to preserve them.
 */

export type ProjectUpgradeTargetLevel = "storyboard" | "video";

export const STORYBOARD_TOP_LEVEL_LOCKABLE_FIELDS = [
  "title",
  "aspectRatio",
  "durationSeconds",
] as const;

export type StoryboardTopLevelLockableField =
  (typeof STORYBOARD_TOP_LEVEL_LOCKABLE_FIELDS)[number];

export const STORYBOARD_SCENE_LOCKABLE_FIELDS = [
  "heading",
  "description",
  "shotType",
  "voiceover",
  "onScreenText",
  "bRoll",
  "transition",
  "requiredAsset",
  "sound",
  "editingNote",
  "durationSeconds",
] as const;

export type StoryboardSceneLockableField =
  (typeof STORYBOARD_SCENE_LOCKABLE_FIELDS)[number];

export const VIDEO_LOCKABLE_FIELDS = [
  "durationSeconds",
  "width",
  "height",
] as const;

export type VideoLockableField = (typeof VIDEO_LOCKABLE_FIELDS)[number];

const SCENE_FIELD_PATTERN = /^scene:([1-9][0-9]*):([a-zA-Z]+)$/;

export type ParsedSceneLock = {
  position: number;
  field: StoryboardSceneLockableField;
};

/**
 * Parses a `"scene:<1-based position>:<field>"` lock key, e.g.
 * `"scene:2:voiceover"`. Returns null for anything that isn't that exact
 * shape or whose field isn't in {@link STORYBOARD_SCENE_LOCKABLE_FIELDS}.
 */
export function parseSceneFieldLock(field: string): ParsedSceneLock | null {
  const match = SCENE_FIELD_PATTERN.exec(field);
  if (!match) return null;
  const position = Number(match[1]);
  const sceneField = match[2] as StoryboardSceneLockableField;
  if (
    !(STORYBOARD_SCENE_LOCKABLE_FIELDS as readonly string[]).includes(
      sceneField,
    )
  ) {
    return null;
  }
  return { position, field: sceneField };
}

export function sceneFieldLockKey(
  position: number,
  field: StoryboardSceneLockableField,
): string {
  return `scene:${position}:${field}`;
}

function isStoryboardTopLevelField(
  field: string,
): field is StoryboardTopLevelLockableField {
  return (STORYBOARD_TOP_LEVEL_LOCKABLE_FIELDS as readonly string[]).includes(
    field,
  );
}

function isVideoLockableField(field: string): field is VideoLockableField {
  return (VIDEO_LOCKABLE_FIELDS as readonly string[]).includes(field);
}

/**
 * Throws a 400 if any requested lock name isn't legal for the given
 * target level. Called synchronously from the public `/upgrade` action,
 * before credits are reserved.
 */
export function validateLockedFieldNames(
  targetLevel: ProjectUpgradeTargetLevel,
  lockedFields: string[],
): void {
  for (const field of lockedFields) {
    if (targetLevel === "storyboard") {
      if (!isStoryboardTopLevelField(field) && !parseSceneFieldLock(field)) {
        throw new BadRequestException(
          `"${field}" is not a lockable storyboard field. Use one of ${STORYBOARD_TOP_LEVEL_LOCKABLE_FIELDS.join(", ")}, or "scene:<position>:<field>" with field one of ${STORYBOARD_SCENE_LOCKABLE_FIELDS.join(", ")}.`,
        );
      }
    } else if (!isVideoLockableField(field)) {
      throw new BadRequestException(
        `"${field}" is not a lockable video field. Use one of ${VIDEO_LOCKABLE_FIELDS.join(", ")}.`,
      );
    }
  }
}

export type LockViolation = {
  field: string;
  message: string;
};

/**
 * Raised when a regeneration changed the value of a field the caller
 * explicitly locked, even after one retry with a stricter prompt.
 * Mirrors QualityGateRejectedError's shape/contract (see
 * ../quality-gate/quality-gate.service.ts): callers must not persist the
 * generation as "succeeded" and must release the credit reservation
 * instead of committing it.
 */
export class LockViolationError extends Error {
  constructor(readonly violations: LockViolation[]) {
    super(
      `Locked field(s) were changed by generation: ${violations
        .map((violation) => violation.field)
        .join(", ")}`,
    );
    this.name = "LockViolationError";
  }
}

function storyboardTopLevelValue(
  storyboard: {
    title: string;
    aspectRatio: string;
    durationSeconds: number | null;
  },
  field: StoryboardTopLevelLockableField,
): string | number | null {
  return storyboard[field];
}

function sceneValue(
  scene: Record<string, unknown> | undefined,
  field: StoryboardSceneLockableField,
): unknown {
  return scene ? scene[field] : undefined;
}

/**
 * Diffs a freshly generated storyboard against the previously persisted
 * one for every field the caller locked. `previous` is null on a
 * first-time generation (nothing to violate yet). Scene locks are matched
 * by 1-based position, matching how NeonProjectsRepository assigns
 * `position: index + 1` when it persists generated scenes.
 */
export function findStoryboardLockViolations(
  previous: ProjectStoryboardRecord | null,
  next: GeneratedStoryboard,
  lockedFields: string[],
): LockViolation[] {
  if (!previous || lockedFields.length === 0) return [];
  const violations: LockViolation[] = [];
  for (const field of lockedFields) {
    const sceneLock = parseSceneFieldLock(field);
    if (sceneLock) {
      const previousScene = previous.scenes.find(
        (scene) => scene.position === sceneLock.position,
      );
      if (!previousScene) continue; // nothing to preserve at that position
      const nextScene = next.scenes[sceneLock.position - 1] as
        Record<string, unknown> | undefined;
      const previousValue = sceneValue(
        previousScene as unknown as Record<string, unknown>,
        sceneLock.field,
      );
      const nextValue = sceneValue(nextScene, sceneLock.field);
      if (previousValue !== nextValue) {
        violations.push({
          field,
          message: `Locked field "${field}" changed from ${JSON.stringify(previousValue)} to ${JSON.stringify(nextValue)}.`,
        });
      }
      continue;
    }
    if (!isStoryboardTopLevelField(field)) continue;
    const previousValue = storyboardTopLevelValue(previous, field);
    const nextValue = storyboardTopLevelValue(next, field);
    if (previousValue !== nextValue) {
      violations.push({
        field,
        message: `Locked field "${field}" changed from ${JSON.stringify(previousValue)} to ${JSON.stringify(nextValue)}.`,
      });
    }
  }
  return violations;
}

/**
 * Force-overwrites locked fields on a generated storyboard with the
 * previous version's values. Used only for the deterministic local
 * fallback (see ProjectWorkflowService.generateStoryboard): that
 * generator is a fixed template with no prompt channel to "try harder"
 * with, so forcing compliance is the pragmatic choice instead of
 * repeatedly failing a generation the caller has no way to influence.
 * The primary, prompt-driven LLM path is still verified afterwards by
 * {@link findStoryboardLockViolations} and can genuinely fail.
 */
export function applyStoryboardLocks(
  storyboard: GeneratedStoryboard,
  lockedFields: string[],
  previous: ProjectStoryboardRecord | null,
): GeneratedStoryboard {
  if (!previous || lockedFields.length === 0) return storyboard;
  const next: GeneratedStoryboard = {
    ...storyboard,
    scenes: storyboard.scenes.map(
      (scene) => ({ ...scene }) as GeneratedStoryboardScene,
    ),
  };
  for (const field of lockedFields) {
    const sceneLock = parseSceneFieldLock(field);
    if (sceneLock) {
      const previousScene = previous.scenes.find(
        (scene) => scene.position === sceneLock.position,
      );
      const targetScene = next.scenes[sceneLock.position - 1] as
        Record<string, unknown> | undefined;
      if (previousScene && targetScene) {
        targetScene[sceneLock.field] = (
          previousScene as unknown as Record<string, unknown>
        )[sceneLock.field];
      }
      continue;
    }
    if (!isStoryboardTopLevelField(field)) continue;
    const value = storyboardTopLevelValue(previous, field);
    if (field === "title" && typeof value === "string") next.title = value;
    else if (field === "aspectRatio" && typeof value === "string")
      next.aspectRatio = value;
    else if (field === "durationSeconds" && typeof value === "number")
      next.durationSeconds = value;
  }
  return next;
}

/**
 * Builds the prompt lines instructing the model which storyboard fields
 * must be copied through unchanged. `strict` is set on the one allowed
 * retry after a first attempt violated a lock.
 */
export function buildStoryboardLockPromptLines(
  lockedFields: string[],
  previous: ProjectStoryboardRecord | null,
  strict = false,
): string[] {
  if (lockedFields.length === 0 || !previous) return [];
  const lines: string[] = [
    strict
      ? "STRICT REQUIREMENT: the previous attempt failed to preserve one or more locked fields verbatim. Copy the exact value shown below into the matching field, unchanged, character for character."
      : "The following fields are locked by the creator and must be carried through EXACTLY as given, unchanged:",
  ];
  for (const field of lockedFields) {
    const sceneLock = parseSceneFieldLock(field);
    if (sceneLock) {
      const previousScene = previous.scenes.find(
        (scene) => scene.position === sceneLock.position,
      );
      const value = sceneValue(
        previousScene as unknown as Record<string, unknown> | undefined,
        sceneLock.field,
      );
      if (value !== null && value !== undefined) {
        lines.push(
          `- Scene ${sceneLock.position} ${sceneLock.field}: ${JSON.stringify(value)}`,
        );
      }
      continue;
    }
    if (!isStoryboardTopLevelField(field)) continue;
    const value = storyboardTopLevelValue(previous, field);
    if (value !== null && value !== undefined) {
      lines.push(`- ${field}: ${JSON.stringify(value)}`);
    }
  }
  return lines.length > 1 ? lines : [];
}

/**
 * Diffs a freshly rendered video artifact against the previous one for
 * every locked technical field. `previous` is null on a first-time
 * render.
 */
export function findVideoLockViolations(
  previous: ProjectVideoRecord | null,
  next: GeneratedVideoArtifact,
  lockedFields: string[],
): LockViolation[] {
  if (!previous || lockedFields.length === 0) return [];
  const violations: LockViolation[] = [];
  for (const field of lockedFields) {
    if (!isVideoLockableField(field)) continue;
    const previousValue = previous[field];
    const nextValue = next[field];
    if (previousValue !== nextValue) {
      violations.push({
        field,
        message: `Locked field "${field}" changed from ${JSON.stringify(previousValue)} to ${JSON.stringify(nextValue)}.`,
      });
    }
  }
  return violations;
}
