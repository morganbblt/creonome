import { describe, expect, it, vi } from "vitest";
import type { CreatorDnaRepository } from "../creator-dna/creator-dna.repository.js";
import {
  extractForbiddenKeywords,
  QualityGateService,
} from "./quality-gate.service.js";

const creatorProfileId = "0198f3a2-82dd-7000-8000-000000000012";

function setup(traits: Array<{ category: string; value: string }> = []) {
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

    expect(result).toEqual({ passed: true, violations: [] });
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

    expect(result).toEqual({ passed: true, violations: [] });
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

    expect(result).toEqual({ passed: true, violations: [] });
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
