import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  applyScriptLocks,
  applyStoryboardLocks,
  buildScriptLockPromptLines,
  buildStoryboardLockPromptLines,
  findScriptLockViolations,
  findStoryboardLockViolations,
  findVideoLockViolations,
  parseSceneFieldLock,
  sceneFieldLockKey,
  validateLockedFieldNames,
  validateScriptLockedFieldNames,
  type GeneratedScriptBlocks,
} from "./locked-fields.js";
import type {
  GeneratedStoryboard,
  ProjectScriptRecord,
  ProjectStoryboardRecord,
  ProjectVideoRecord,
} from "./projects.repository.js";
import type { GeneratedVideoArtifact } from "./video/video-provider.js";

function storyboardRecord(
  overrides: Partial<ProjectStoryboardRecord> = {},
): ProjectStoryboardRecord {
  return {
    id: "storyboard-1",
    title: "The silence before the drop",
    aspectRatio: "9:16",
    durationSeconds: 30,
    scenes: [
      {
        id: "scene-1",
        position: 1,
        startSeconds: 0,
        heading: "Hold the room",
        description: "Locked close-up on the silent speaker cone.",
        shotType: "Extreme close-up",
        voiceover: "Hold the empty room.",
        onScreenText: "Before the drop",
        bRoll: "Dust moving through the studio light.",
        transition: "Hard cut on the needle touch.",
        requiredAsset: "Studio speaker close-up",
        sound: "Room tone only",
        editingNote: "Keep the first frame still for two seconds.",
        referenceFrameUrl: null,
        durationSeconds: 8,
      },
      {
        id: "scene-2",
        position: 2,
        startSeconds: 8,
        heading: "Make the gesture",
        description: "Hand lowers the needle while the camera tracks down.",
        shotType: "Macro tracking shot",
        voiceover: null,
        onScreenText: null,
        bRoll: "DAW playhead waiting at bar one.",
        transition: "Cut on action.",
        requiredAsset: "Turntable and hand insert",
        sound: "Needle contact and vinyl noise",
        editingNote: "Let the contact transient lead the next cut.",
        referenceFrameUrl: null,
        durationSeconds: 9,
      },
    ],
    ...overrides,
  };
}

function generatedStoryboard(
  overrides: Partial<GeneratedStoryboard> = {},
): GeneratedStoryboard {
  const previous = storyboardRecord();
  return {
    title: previous.title,
    aspectRatio: previous.aspectRatio,
    durationSeconds: previous.durationSeconds as number,
    scenes: previous.scenes.map((scene) => ({
      heading: scene.heading,
      description: scene.description,
      shotType: scene.shotType,
      voiceover: scene.voiceover,
      onScreenText: scene.onScreenText,
      bRoll: scene.bRoll,
      transition: scene.transition,
      requiredAsset: scene.requiredAsset,
      sound: scene.sound,
      editingNote: scene.editingNote,
      referenceFrameUrl: scene.referenceFrameUrl,
      durationSeconds: scene.durationSeconds as number,
    })),
    ...overrides,
  };
}

function videoRecord(
  overrides: Partial<ProjectVideoRecord> = {},
): ProjectVideoRecord {
  return {
    id: "video-1",
    projectId: "project-1",
    previewUrl: "/demo/creonome-vertical-demo.mp4",
    mimeType: "video/mp4",
    durationSeconds: 8,
    width: 540,
    height: 960,
    gcsUri: "mvp://workspace/project/video.mp4",
    provider: "creonome",
    model: "deterministic-motion-preview-v1",
    simulated: true,
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    ...overrides,
  };
}

function videoArtifact(
  overrides: Partial<GeneratedVideoArtifact> = {},
): GeneratedVideoArtifact {
  return {
    previewUrl: "/demo/creonome-vertical-demo.mp4",
    gcsUri: "mvp://workspace/project/video.mp4",
    mimeType: "video/mp4",
    durationSeconds: 8,
    width: 540,
    height: 960,
    byteSize: 771_365,
    provider: "creonome",
    model: "deterministic-motion-preview-v1",
    simulated: true,
    fallbackReasonCode: "VEO_QUOTA",
    ...overrides,
  };
}

describe("parseSceneFieldLock / sceneFieldLockKey", () => {
  it("round-trips a valid scene lock key", () => {
    const key = sceneFieldLockKey(2, "voiceover");
    expect(key).toBe("scene:2:voiceover");
    expect(parseSceneFieldLock(key)).toEqual({
      position: 2,
      field: "voiceover",
    });
  });

  it("rejects malformed or unknown-field scene keys", () => {
    expect(parseSceneFieldLock("scene:0:voiceover")).toBeNull();
    expect(parseSceneFieldLock("scene:2:notAField")).toBeNull();
    expect(parseSceneFieldLock("title")).toBeNull();
    expect(parseSceneFieldLock("scene:abc:voiceover")).toBeNull();
  });
});

describe("validateLockedFieldNames", () => {
  it("accepts legal storyboard top-level and scene field names", () => {
    expect(() =>
      validateLockedFieldNames("storyboard", [
        "title",
        "aspectRatio",
        "scene:1:voiceover",
      ]),
    ).not.toThrow();
  });

  it("rejects an illegal storyboard field name", () => {
    expect(() =>
      validateLockedFieldNames("storyboard", ["notAStoryboardField"]),
    ).toThrow(BadRequestException);
  });

  it("accepts legal video field names and rejects illegal ones", () => {
    expect(() =>
      validateLockedFieldNames("video", ["durationSeconds", "width", "height"]),
    ).not.toThrow();
    expect(() => validateLockedFieldNames("video", ["title"])).toThrow(
      BadRequestException,
    );
  });
});

describe("findStoryboardLockViolations", () => {
  it("returns no violations when nothing is locked or there is no previous version", () => {
    expect(
      findStoryboardLockViolations(null, generatedStoryboard(), ["title"]),
    ).toEqual([]);
    expect(
      findStoryboardLockViolations(
        storyboardRecord(),
        generatedStoryboard(),
        [],
      ),
    ).toEqual([]);
  });

  it("reports no violation when a locked top-level field survives regeneration", () => {
    const previous = storyboardRecord();
    const next = generatedStoryboard({ aspectRatio: "1:1" }); // unlocked field changes
    const violations = findStoryboardLockViolations(previous, next, ["title"]);
    expect(violations).toEqual([]);
  });

  it("allows an unlocked field to change across a regeneration", () => {
    const previous = storyboardRecord();
    const next = generatedStoryboard({
      durationSeconds: 45,
      aspectRatio: "1:1",
    });
    // Neither durationSeconds nor aspectRatio is locked here.
    const violations = findStoryboardLockViolations(previous, next, ["title"]);
    expect(violations).toEqual([]);
    expect(next.durationSeconds).toBe(45);
    expect(next.aspectRatio).toBe("1:1");
  });

  it("reports a clear violation when a locked top-level field changes", () => {
    const previous = storyboardRecord();
    const next = generatedStoryboard({ title: "A completely different hook" });
    const violations = findStoryboardLockViolations(previous, next, ["title"]);
    expect(violations).toEqual([
      {
        field: "title",
        message: expect.stringContaining('"title"'),
      },
    ]);
    expect(violations[0]?.message).toContain("The silence before the drop");
    expect(violations[0]?.message).toContain("A completely different hook");
  });

  it("reports a clear violation when a locked scene field changes", () => {
    const previous = storyboardRecord();
    const next = generatedStoryboard();
    next.scenes[0]!.voiceover = "A brand new line entirely.";
    const violations = findStoryboardLockViolations(previous, next, [
      "scene:1:voiceover",
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: "scene:1:voiceover" });
  });

  it("does not flag a locked scene position that does not exist on either side", () => {
    const previous = storyboardRecord();
    const next = generatedStoryboard();
    const violations = findStoryboardLockViolations(previous, next, [
      "scene:99:voiceover",
    ]);
    expect(violations).toEqual([]);
  });
});

describe("applyStoryboardLocks", () => {
  it("force-overwrites locked fields with the previous version's values", () => {
    const previous = storyboardRecord();
    const generated = generatedStoryboard({
      title: "Deterministic fallback title",
      aspectRatio: "1:1",
    });
    generated.scenes[0]!.voiceover = "Deterministic fallback voiceover";

    const result = applyStoryboardLocks(
      generated,
      ["title", "scene:1:voiceover"],
      previous,
    );

    expect(result.title).toBe(previous.title);
    expect(result.scenes[0]?.voiceover).toBe(previous.scenes[0]?.voiceover);
    // Unlocked field is left as the deterministic generator produced it.
    expect(result.aspectRatio).toBe("1:1");
  });

  it("is a no-op when there is no previous version or nothing is locked", () => {
    const generated = generatedStoryboard({ title: "Untouched" });
    expect(applyStoryboardLocks(generated, ["title"], null)).toBe(generated);
    expect(applyStoryboardLocks(generated, [], storyboardRecord())).toBe(
      generated,
    );
  });
});

describe("buildStoryboardLockPromptLines", () => {
  it("returns nothing when there is nothing to lock", () => {
    expect(buildStoryboardLockPromptLines([], storyboardRecord())).toEqual([]);
    expect(buildStoryboardLockPromptLines(["title"], null)).toEqual([]);
  });

  it("includes the previous value and escalates wording on a strict retry", () => {
    const previous = storyboardRecord();
    const normal = buildStoryboardLockPromptLines(["title"], previous, false);
    expect(normal.some((line) => line.includes(previous.title))).toBe(true);
    expect(normal[0]).not.toContain("STRICT REQUIREMENT");

    const strict = buildStoryboardLockPromptLines(["title"], previous, true);
    expect(strict[0]).toContain("STRICT REQUIREMENT");
    expect(strict.some((line) => line.includes(previous.title))).toBe(true);
  });
});

function scriptRecord(
  overrides: Partial<ProjectScriptRecord> = {},
): ProjectScriptRecord {
  return {
    id: "script-1",
    projectId: "project-1",
    title: "The silence before the drop",
    hook: "Hold the empty room.",
    body: "Lower the needle, wait for the first kick, then reveal the session.",
    callToAction: "What arrives after your silence?",
    caption: "The room is part of the arrangement.",
    platforms: ["tiktok", "instagram"],
    durationSeconds: 30,
    ...overrides,
  };
}

function generatedScriptBlocks(
  overrides: Partial<GeneratedScriptBlocks> = {},
): GeneratedScriptBlocks {
  const previous = scriptRecord();
  return {
    hook: previous.hook,
    body: previous.body,
    callToAction: previous.callToAction,
    caption: previous.caption,
    ...overrides,
  };
}

describe("validateScriptLockedFieldNames", () => {
  it("accepts legal script block names that are not the field being changed", () => {
    expect(() =>
      validateScriptLockedFieldNames("body", ["hook", "callToAction"]),
    ).not.toThrow();
  });

  it("rejects an illegal script field name", () => {
    expect(() => validateScriptLockedFieldNames("body", ["title"])).toThrow(
      BadRequestException,
    );
  });

  it("rejects locking the very block being changed", () => {
    expect(() => validateScriptLockedFieldNames("hook", ["hook"])).toThrow(
      BadRequestException,
    );
  });
});

describe("findScriptLockViolations", () => {
  it("returns no violations when nothing is locked or there is no previous script", () => {
    expect(
      findScriptLockViolations(null, generatedScriptBlocks(), ["hook"]),
    ).toEqual([]);
    expect(
      findScriptLockViolations(scriptRecord(), generatedScriptBlocks(), []),
    ).toEqual([]);
  });

  it("allows an unlocked block to change while a locked one survives", () => {
    const previous = scriptRecord();
    const next = generatedScriptBlocks({ body: "A completely new body." });
    const violations = findScriptLockViolations(previous, next, ["hook"]);
    expect(violations).toEqual([]);
    expect(next.body).toBe("A completely new body.");
  });

  it("reports a clear violation when a locked block changes", () => {
    const previous = scriptRecord();
    const next = generatedScriptBlocks({ hook: "A different hook entirely." });
    const violations = findScriptLockViolations(previous, next, ["hook"]);
    expect(violations).toEqual([
      { field: "hook", message: expect.stringContaining('"hook"') },
    ]);
  });
});

describe("applyScriptLocks", () => {
  it("force-overwrites locked blocks with the previous script's values", () => {
    const previous = scriptRecord();
    const generated = generatedScriptBlocks({
      hook: "Deterministic fallback hook",
      body: "Deterministic fallback body",
    });

    const result = applyScriptLocks(generated, ["hook"], previous);

    expect(result.hook).toBe(previous.hook);
    // Unlocked field is left as the deterministic generator produced it.
    expect(result.body).toBe("Deterministic fallback body");
  });

  it("is a no-op when there is no previous script or nothing is locked", () => {
    const generated = generatedScriptBlocks({ hook: "Untouched" });
    expect(applyScriptLocks(generated, ["hook"], null)).toBe(generated);
    expect(applyScriptLocks(generated, [], scriptRecord())).toBe(generated);
  });
});

describe("buildScriptLockPromptLines", () => {
  it("returns nothing when there is nothing to lock", () => {
    expect(buildScriptLockPromptLines([], scriptRecord())).toEqual([]);
    expect(buildScriptLockPromptLines(["hook"], null)).toEqual([]);
  });

  it("includes the previous value and escalates wording on a strict retry", () => {
    const previous = scriptRecord();
    const normal = buildScriptLockPromptLines(["hook"], previous, false);
    expect(normal.some((line) => line.includes(previous.hook))).toBe(true);
    expect(normal[0]).not.toContain("STRICT REQUIREMENT");

    const strict = buildScriptLockPromptLines(["hook"], previous, true);
    expect(strict[0]).toContain("STRICT REQUIREMENT");
    expect(strict.some((line) => line.includes(previous.hook))).toBe(true);
  });
});

describe("findVideoLockViolations", () => {
  it("returns no violations when nothing is locked or there is no previous render", () => {
    expect(findVideoLockViolations(null, videoArtifact(), ["width"])).toEqual(
      [],
    );
    expect(findVideoLockViolations(videoRecord(), videoArtifact(), [])).toEqual(
      [],
    );
  });

  it("reports no violation when a locked field survives and lets an unlocked one change", () => {
    const previous = videoRecord();
    const next = videoArtifact({ height: 1280 }); // height not locked
    const violations = findVideoLockViolations(previous, next, [
      "durationSeconds",
      "width",
    ]);
    expect(violations).toEqual([]);
    expect(next.height).toBe(1280);
  });

  it("reports a clear violation when a locked video field changes", () => {
    const previous = videoRecord();
    const next = videoArtifact({ width: 720, height: 1280 });
    const violations = findVideoLockViolations(previous, next, ["width"]);
    expect(violations).toEqual([
      { field: "width", message: expect.stringContaining('"width"') },
    ]);
  });
});
