/**
 * Mirrors the per-scene field set the API accepts for a `"scene:<pos>:<field>"`
 * lock key (see apps/api/src/modules/projects/locked-fields.ts,
 * STORYBOARD_SCENE_LOCKABLE_FIELDS). Kept in sync manually — the API
 * deliberately keeps this allow-list out of the shared `@creonome/contracts`
 * package so it can evolve without a contract bump (see that file's
 * docstring). Shared between the "lock the whole scene" checkbox in
 * StoryboardUpgrade (full-storyboard regeneration) and the per-field lock
 * checkboxes in StoryboardEditor (single-scene regeneration).
 */
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
