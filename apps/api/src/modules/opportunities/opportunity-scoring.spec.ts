import { describe, expect, it } from "vitest";
import {
  OPPORTUNITY_SCORE_WEIGHTS,
  computeOpportunitySubScores,
  type OpportunityScoringDnaTrait,
} from "./opportunity-scoring.js";

const now = new Date("2026-08-04T12:00:00.000Z");

const baseConcept = {
  title: "One gesture, one drop",
  pitch: "Film one decisive production gesture, then let the reveal land.",
};

const voiceTraits: OpportunityScoringDnaTrait[] = [
  {
    category: "voice",
    label: "Tone",
    value: "precise, intimate, never over-explained",
    confidence: 0.95,
  },
  {
    category: "visual",
    label: "Palette",
    value: "charcoal rooms, warm practical lights, soft grain",
    confidence: 0.9,
  },
];

describe("computeOpportunitySubScores", () => {
  it("declares column weights that sum to 1 and match the documented bible fold", () => {
    const sum =
      OPPORTUNITY_SCORE_WEIGHTS.momentum +
      OPPORTUNITY_SCORE_WEIGHTS.dnaFit +
      OPPORTUNITY_SCORE_WEIGHTS.novelty +
      OPPORTUNITY_SCORE_WEIGHTS.feasibility;
    expect(sum).toBeCloseTo(1, 10);
    expect(OPPORTUNITY_SCORE_WEIGHTS).toEqual({
      momentum: 0.38,
      dnaFit: 0.28,
      novelty: 0.24,
      feasibility: 0.1,
    });
  });

  it("never copies one aggregate number into every column", () => {
    const result = computeOpportunitySubScores({
      concept: baseConcept,
      trend: {
        momentumScore: 88,
        lifecycle: "emerging",
        lastSeenAt: new Date("2026-08-03T12:00:00.000Z"),
      },
      dnaTraits: voiceTraits,
      recentOpportunities: [
        {
          title: "A completely unrelated idea",
          pitch: "Something about breakfast recipes and morning routines.",
        },
      ],
      now,
    });
    const values = [
      result.momentum,
      result.dnaFit,
      result.novelty,
      result.feasibility,
    ];
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  describe("momentum", () => {
    it("falls back to a documented neutral baseline with no trend signal", () => {
      const result = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      expect(result.momentum).toBe(50);
    });

    it("rewards a fresh, emerging/growing trend over a stale, declining one", () => {
      const fresh = computeOpportunitySubScores({
        concept: baseConcept,
        trend: {
          momentumScore: 80,
          lifecycle: "growing",
          lastSeenAt: new Date("2026-08-04T10:00:00.000Z"),
        },
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      const stale = computeOpportunitySubScores({
        concept: baseConcept,
        trend: {
          momentumScore: 80,
          lifecycle: "declining",
          lastSeenAt: new Date("2026-06-01T10:00:00.000Z"),
        },
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      expect(fresh.momentum).toBeGreaterThan(stale.momentum);
    });

    it("applies an additional saturation/risk penalty to the overall score", () => {
      const saturated = computeOpportunitySubScores({
        concept: baseConcept,
        trend: {
          momentumScore: 80,
          lifecycle: "saturated",
          lastSeenAt: new Date("2026-08-04T10:00:00.000Z"),
        },
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      const peaking = computeOpportunitySubScores({
        concept: baseConcept,
        trend: {
          momentumScore: 80,
          lifecycle: "peaking",
          lastSeenAt: new Date("2026-08-04T10:00:00.000Z"),
        },
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      // Saturated momentum is already lower than peaking's before the
      // explicit risk penalty is applied, so overall should drop by more
      // than the momentum-column delta alone would explain.
      const momentumColumnDelta =
        (peaking.momentum - saturated.momentum) *
        OPPORTUNITY_SCORE_WEIGHTS.momentum;
      const overallDelta = peaking.overall - saturated.overall;
      expect(overallDelta).toBeGreaterThan(momentumColumnDelta);
    });
  });

  describe("dnaFit", () => {
    it("scores higher when the concept text overlaps the creator's DNA vocabulary", () => {
      const matching = computeOpportunitySubScores({
        concept: {
          title: "Precise and intimate charcoal room reveal",
          pitch: "Warm practical lights, soft grain, never over-explained.",
        },
        trend: null,
        dnaTraits: voiceTraits,
        recentOpportunities: [],
        now,
      });
      const unrelated = computeOpportunitySubScores({
        concept: {
          title: "Bright neon skate park montage",
          pitch: "Loud colors, fast cuts, nothing about quiet restraint.",
        },
        trend: null,
        dnaTraits: voiceTraits,
        recentOpportunities: [],
        now,
      });
      expect(matching.dnaFit).toBeGreaterThan(unrelated.dnaFit);
    });

    it("rewards higher trait extraction confidence, all else equal", () => {
      const highConfidence = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: voiceTraits.map((trait) => ({ ...trait, confidence: 1 })),
        recentOpportunities: [],
        now,
      });
      const lowConfidence = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: voiceTraits.map((trait) => ({ ...trait, confidence: 0.1 })),
        recentOpportunities: [],
        now,
      });
      expect(highConfidence.dnaFit).toBeGreaterThan(lowConfidence.dnaFit);
    });
  });

  describe("novelty", () => {
    it("scores lower when the concept closely echoes a recent opportunity", () => {
      const overlapping = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [],
        recentOpportunities: [baseConcept],
        now,
      });
      const distinct = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [],
        recentOpportunities: [
          {
            title: "A completely unrelated idea",
            pitch: "Something about breakfast recipes and morning routines.",
          },
        ],
        now,
      });
      expect(overlapping.novelty).toBeLessThan(distinct.novelty);
    });

    it("uses a documented above-average baseline with no recent history", () => {
      const result = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      expect(result.novelty).toBeGreaterThan(50);
    });
  });

  describe("feasibility", () => {
    const shootingBoundary: OpportunityScoringDnaTrait = {
      category: "boundary",
      label: "Shooting time",
      value: "Never available to shoot on camera before noon",
      confidence: 0.9,
    };
    const wordingBoundary: OpportunityScoringDnaTrait = {
      category: "boundary",
      label: "Avoid",
      value: "generic productivity language and forced hype",
      confidence: 0.95,
    };

    it("penalizes a concept that conflicts with a production-constraint boundary", () => {
      const conflicting = computeOpportunitySubScores({
        concept: {
          title: "Shoot on camera before noon",
          pitch: "A camera-forward morning routine filmed before noon.",
        },
        trend: null,
        dnaTraits: [shootingBoundary],
        recentOpportunities: [],
        now,
      });
      const clean = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [shootingBoundary],
        recentOpportunities: [],
        now,
      });
      expect(conflicting.feasibility).toBeLessThan(clean.feasibility);
    });

    it("ignores non-production boundaries (pure wording/style constraints)", () => {
      const withWordingBoundaryOnly = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [wordingBoundary],
        recentOpportunities: [],
        now,
      });
      const withNoBoundaries = computeOpportunitySubScores({
        concept: baseConcept,
        trend: null,
        dnaTraits: [],
        recentOpportunities: [],
        now,
      });
      expect(withWordingBoundaryOnly.feasibility).toBe(
        withNoBoundaries.feasibility,
      );
    });
  });

  it("clamps every sub-score and the overall score to [0, 100]", () => {
    const result = computeOpportunitySubScores({
      concept: {
        title: "Shoot on camera before noon with budget crew and equipment",
        pitch:
          "Shooting, camera, budget, schedule, crew, equipment, location, cost.",
      },
      trend: {
        momentumScore: 100,
        lifecycle: "saturated",
        lastSeenAt: new Date("2020-01-01T00:00:00.000Z"),
      },
      dnaTraits: [
        {
          category: "boundary",
          label: "Budget",
          value: "no expensive gear, no studio, no travel, no crew",
          confidence: 0.9,
        },
        {
          category: "boundary",
          label: "Camera",
          value: "never shows face on camera, avoids shooting on schedule",
          confidence: 0.9,
        },
      ],
      recentOpportunities: [
        {
          title: "Shoot on camera before noon with budget crew and equipment",
          pitch:
            "Shooting, camera, budget, schedule, crew, equipment, location, cost.",
        },
      ],
      now,
    });
    for (const value of [
      result.momentum,
      result.dnaFit,
      result.novelty,
      result.feasibility,
      result.overall,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("computes overall as the documented weighted sum minus any risk penalty", () => {
    const dnaTraits = voiceTraits;
    const trend = {
      momentumScore: 70,
      lifecycle: "peaking",
      lastSeenAt: new Date("2026-08-03T12:00:00.000Z"),
    };
    const recentOpportunities = [
      {
        title: "A completely unrelated idea",
        pitch: "Something about breakfast recipes and morning routines.",
      },
    ];
    const result = computeOpportunitySubScores({
      concept: baseConcept,
      trend,
      dnaTraits,
      recentOpportunities,
      now,
    });
    const expectedWeighted =
      result.momentum * OPPORTUNITY_SCORE_WEIGHTS.momentum +
      result.dnaFit * OPPORTUNITY_SCORE_WEIGHTS.dnaFit +
      result.novelty * OPPORTUNITY_SCORE_WEIGHTS.novelty +
      result.feasibility * OPPORTUNITY_SCORE_WEIGHTS.feasibility;
    // "peaking" carries no explicit saturation/risk penalty.
    expect(result.overall).toBe(Math.round(expectedWeighted));
  });
});
