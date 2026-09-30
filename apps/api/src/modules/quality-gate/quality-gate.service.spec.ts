import { describe, expect, it, vi } from "vitest";
import type { CreatorDnaRepository } from "../creator-dna/creator-dna.repository.js";
import {
  extractForbiddenKeywords,
  QualityGateService,
} from "./quality-gate.service.js";

const creatorProfileId = "0198f3a2-82dd-7000-8000-000000000012";

function setup(
  traits: Array<{ category: string; value: string; layer?: string }> = [],
) {
  const creatorDna = {
    getCurrent: vi.fn().mockResolvedValue({
      id: "dna-1",
      version: 1,
      summary: "A restrained, studio-focused music creator.",
      confirmed: true,
      traits: traits.map((trait, index) => ({
        id: `trait-${index}`,
        category: trait.category,
        label: trait.category,
        value: trait.value,
        // Boundary-category fixtures default to the forbidden layer to
        // match what onboarding-mapping.ts always produces; tests that
        // want to prove layer (not category) is the source of truth pass
        // an explicit override.
        layer:
          trait.layer ??
          (trait.category === "boundary" ? "forbidden" : "observed"),
        confidence: null,
        evidence: {},
      })),
    }),
  } as unknown as CreatorDnaRepository;

  return {
    service: new QualityGateService(creatorDna),
    creatorDna,
  };
}

describe("extractForbiddenKeywords", () => {
  it("strips a leading negation and returns the salient words", () => {
    expect(extractForbiddenKeywords("No alcohol brand promotions")).toEqual([
      "alcohol",
      "promotions",
    ]);
  });

  it("keeps the phrase when there is no negation prefix", () => {
    expect(extractForbiddenKeywords("Politics")).toEqual(["politics"]);
  });
});

describe("QualityGateService.evaluateScript", () => {
  it("passes a script with a hook, a CTA and no boundary conflicts", async () => {
    const { service } = setup([{ category: "boundary", value: "No politics" }]);

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Hold the empty room.",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "What arrives after your silence?",
      caption: "The room is part of the arrangement.",
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("rejects a script that mentions a forbidden topic from the creator boundaries", async () => {
    const { service, creatorDna } = setup([
      { category: "boundary", value: "No alcohol brand promotions" },
    ]);

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Grab a cold beer from our alcohol sponsor before we start.",
      body: "Then we get into the studio session and build the beat together.",
      callToAction: "Follow for part two.",
      caption: null,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden_topic" }),
      ]),
    );
    expect(creatorDna.getCurrent).toHaveBeenCalledWith(creatorProfileId);
  });

  it("does not reject a boundary-category trait whose layer is not forbidden", async () => {
    const { service } = setup([
      {
        category: "boundary",
        value: "No alcohol brand promotions",
        layer: "learned",
      },
    ]);

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Grab a cold beer from our alcohol sponsor before we start.",
      body: "Then we get into the studio session and build the beat together.",
      callToAction: "Follow for part two.",
      caption: null,
    });

    expect(result.passed).toBe(true);
  });

  it("rejects a forbidden-layer trait outside the boundary category", async () => {
    const { service } = setup([
      { category: "person", value: "Jane Doe", layer: "forbidden" },
    ]);

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Shoutout to Jane Doe for the inspiration.",
      body: "Then we get into the studio session and build the beat together.",
      callToAction: "Follow for part two.",
      caption: null,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden_topic" }),
      ]),
    );
  });

  it("rejects a script that is missing a call to action", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Hold the empty room.",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: null,
      caption: null,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      { code: "missing_call_to_action", message: expect.any(String) },
    ]);
  });

  it("rejects a script that is missing a hook", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "   ",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "Follow for part two.",
      caption: null,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_hook" }),
      ]),
    );
  });
});

describe("QualityGateService.evaluateScript possible_close_reproduction", () => {
  it("passes a script whose reference texts share nothing with the generated content", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Hold the empty room.",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "What arrives after your silence?",
      caption: null,
      referenceTexts: [
        "The best way to master a chorus is to isolate the vocal take and loop the transition sixteen times before touching the mix.",
      ],
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("rejects a script whose hook is a near-verbatim copy of a reference/trend source sentence", async () => {
    const { service } = setup();

    const sharedSentence =
      "Hold the empty room and wait for the drop before you say a single word.";

    const result = await service.evaluateScript(creatorProfileId, {
      hook: sharedSentence,
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "What arrives after your silence?",
      caption: null,
      referenceTexts: [sharedSentence],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "possible_close_reproduction" }),
      ]),
    );
  });

  it("does not run the close-reproduction check when no reference texts are provided", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Hold the empty room.",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "What arrives after your silence?",
      caption: null,
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });
});

describe("QualityGateService.evaluateScript unverified_claim", () => {
  it("passes a script whose only percentage figure is backed by a cited source", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Meet the vocalist who records every take live in one breath.",
      body: "According to a recent study, 42% of listeners finish the full track when the hook lands in the first three seconds.",
      callToAction: "Press play and hear the difference for yourself.",
      caption: null,
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("flags an absolute, guarantee-shaped promise as a warning without failing the gate", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "This routine is guaranteed to fix your vocal fatigue overnight.",
      body: "It always works, no matter your genre or your studio setup.",
      callToAction: "Try it and you will never need another warmup again.",
      caption: null,
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unverified_claim" }),
      ]),
    );
  });

  it("flags an unsourced percentage claim as a warning without failing the gate", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Here's the trick nobody talks about for high notes.",
      body: "This warmup improves your range by 73% in under a week.",
      callToAction: "Save this for your next session.",
      caption: null,
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unverified_claim" }),
      ]),
    );
  });

  it("does not fail a script over a rhetorical 'never' in its hook", async () => {
    const { service } = setup();

    const result = await service.evaluateScript(creatorProfileId, {
      hook: "Tu ne vas jamais deviner ce que ce sample cache.",
      body: "Lower the needle, wait for the first kick, then reveal the session.",
      callToAction: "What arrives after your silence?",
      caption: null,
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("QualityGateService.evaluateStoryboard", () => {
  const baseScene = {
    heading: "Hold the room",
    description: "Locked close-up on the silent speaker cone.",
    voiceover: null,
    onScreenText: null,
  };

  it("passes a storyboard whose scene durations add up and stays in range", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(creatorProfileId, {
      durationSeconds: 30,
      scenes: [
        { ...baseScene, durationSeconds: 8 },
        { ...baseScene, durationSeconds: 9 },
        { ...baseScene, durationSeconds: 13 },
      ],
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("rejects a storyboard that references a forbidden topic in a scene", async () => {
    const { service } = setup([
      { category: "boundary", value: "No alcohol brand promotions" },
    ]);

    const result = await service.evaluateStoryboard(creatorProfileId, {
      durationSeconds: 17,
      scenes: [
        { ...baseScene, durationSeconds: 8 },
        {
          ...baseScene,
          description: "Cut to the table showing our alcohol sponsor's cans.",
          durationSeconds: 9,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden_topic" }),
      ]),
    );
  });

  it("rejects a storyboard whose scene durations do not add up to the total", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(creatorProfileId, {
      durationSeconds: 30,
      scenes: [
        { ...baseScene, durationSeconds: 8 },
        { ...baseScene, durationSeconds: 9 },
        { ...baseScene, durationSeconds: 20 },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duration_mismatch" }),
      ]),
    );
  });

  it("rejects a storyboard with fewer than three scenes", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(creatorProfileId, {
      durationSeconds: 8,
      scenes: [{ ...baseScene, durationSeconds: 8 }],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "scene_count_out_of_range" }),
      ]),
    );
  });
});

describe("QualityGateService.evaluateVideo", () => {
  it("passes a video rendered at 9:16", async () => {
    const { service } = setup();

    const result = await service.evaluateVideo(creatorProfileId, {
      width: 720,
      height: 1280,
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("rejects a video that is not rendered in 9:16", async () => {
    const { service } = setup();

    const result = await service.evaluateVideo(creatorProfileId, {
      width: 1280,
      height: 720,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      { code: "invalid_aspect_ratio", message: expect.any(String) },
    ]);
  });

  it("rejects a correctly-formatted video whose source text references a forbidden topic", async () => {
    const { service } = setup([
      { category: "boundary", value: "No alcohol brand promotions" },
    ]);

    const result = await service.evaluateVideo(creatorProfileId, {
      width: 720,
      height: 1280,
      sourceText: "Grab a cold beer from our alcohol sponsor before we start.",
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden_topic" }),
      ]),
    );
  });
});

describe("QualityGateService.evaluateStoryboard script consistency", () => {
  const script = {
    hook: "Hold the empty room.",
    body: "Lower the needle on the vinyl. Reveal the finished session.",
    callToAction: "Subscribe for the next session.",
    caption: null,
  };
  const scene = (heading: string, description: string) => ({
    heading,
    description,
    voiceover: null,
    onScreenText: null,
    durationSeconds: 10,
  });

  it("does not run the consistency check when no script is provided", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(creatorProfileId, {
      durationSeconds: 30,
      scenes: [
        scene("Kitchen", "A chef slices onions."),
        scene("Garden", "Watering tomatoes."),
        scene("Street", "Traffic passes by."),
      ],
    });

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("passes a storyboard whose scenes follow the script", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(
      creatorProfileId,
      {
        durationSeconds: 30,
        scenes: [
          scene("Empty room", "Wide shot of the empty room."),
          scene("Needle drop", "Close-up as the needle meets the vinyl."),
          scene("Finished session", "Reveal the finished session; subscribe."),
        ],
      },
      script,
    );

    expect(result).toEqual({ passed: true, violations: [], warnings: [] });
  });

  it("warns, without failing, about orphan scenes and dropped script beats", async () => {
    const { service } = setup();

    const result = await service.evaluateStoryboard(
      creatorProfileId,
      {
        durationSeconds: 30,
        scenes: [
          scene("Empty room", "Wide shot of the empty room."),
          scene("Needle drop", "Close-up as the needle meets the vinyl."),
          scene("Kitchen", "A chef slices onions."),
        ],
      },
      script,
    );

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings.map(({ code }) => code).sort()).toEqual([
      "script_segment_without_scene",
      "script_segment_without_scene",
      "storyboard_orphan_scene",
    ]);
  });
});
