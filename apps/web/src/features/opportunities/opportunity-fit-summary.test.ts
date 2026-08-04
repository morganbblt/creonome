import type { OpportunitySubScores } from "@creonome/contracts";
import { describe, expect, it } from "vitest";
import {
  buildSubScoreBreakdown,
  listOpportunityCaveats,
  listOpportunityStrengths,
  summarizeOpportunityFit,
  toneForScore,
} from "./opportunity-fit-summary";

describe("toneForScore", () => {
  it("classifies scores into strong/solid/limited bands", () => {
    expect(toneForScore(95)).toBe("strong");
    expect(toneForScore(80)).toBe("strong");
    expect(toneForScore(79)).toBe("solid");
    expect(toneForScore(60)).toBe("solid");
    expect(toneForScore(59)).toBe("limited");
    expect(toneForScore(0)).toBe("limited");
  });
});

describe("buildSubScoreBreakdown", () => {
  it("returns all four dimensions in a fixed order with matching values", () => {
    const subScores: OpportunitySubScores = {
      momentum: 88,
      dnaFit: 91,
      novelty: 42,
      feasibility: 70,
    };
    const breakdown = buildSubScoreBreakdown(subScores);
    expect(breakdown.map((item) => item.dimension)).toEqual([
      "momentum",
      "dnaFit",
      "novelty",
      "feasibility",
    ]);
    expect(breakdown.map((item) => item.value)).toEqual([88, 91, 42, 70]);
    expect(breakdown.map((item) => item.tone)).toEqual([
      "strong",
      "strong",
      "limited",
      "solid",
    ]);
  });
});

describe("summarizeOpportunityFit", () => {
  it("names both a strength and a caveat when the scores diverge", () => {
    const summary = summarizeOpportunityFit({
      momentum: 90,
      dnaFit: 75,
      novelty: 65,
      feasibility: 35,
    });
    expect(summary).toContain("Momentum is strong (90/100)");
    expect(summary).toContain("feasibility is limited (35/100)");
    expect(summary).toContain("production constraints");
  });

  it("produces different summaries for different inputs", () => {
    const a = summarizeOpportunityFit({
      momentum: 90,
      dnaFit: 40,
      novelty: 70,
      feasibility: 70,
    });
    const b = summarizeOpportunityFit({
      momentum: 40,
      dnaFit: 90,
      novelty: 70,
      feasibility: 70,
    });
    expect(a).not.toBe(b);
    expect(a).toContain("Momentum is strong");
    expect(b).toContain("Creator DNA fit is strong");
  });

  it("names the tied leader as the standout signal when every score is identical", () => {
    const summary = summarizeOpportunityFit({
      momentum: 75,
      dnaFit: 75,
      novelty: 75,
      feasibility: 75,
    });
    expect(summary).toBe("Momentum is the standout signal at 75/100.");
  });

  it("falls back to a moderate framing when nothing is strong or limited", () => {
    const summary = summarizeOpportunityFit({
      momentum: 65,
      dnaFit: 70,
      novelty: 68,
      feasibility: 62,
    });
    expect(summary).toContain("All four signals are moderate");
    expect(summary).toContain("creator DNA fit");
  });
});

describe("listOpportunityStrengths / listOpportunityCaveats", () => {
  it("lists strengths strongest-first and caveats weakest-first", () => {
    const subScores: OpportunitySubScores = {
      momentum: 95,
      dnaFit: 82,
      novelty: 20,
      feasibility: 10,
    };
    const strengths = listOpportunityStrengths(subScores);
    const caveats = listOpportunityCaveats(subScores);
    expect(strengths).toHaveLength(2);
    expect(strengths[0]).toContain("Momentum is strong (95/100)");
    expect(strengths[1]).toContain("Creator DNA fit is strong (82/100)");
    expect(caveats).toHaveLength(2);
    expect(caveats[0]).toContain("Feasibility is limited (10/100)");
    expect(caveats[1]).toContain("Novelty is limited (20/100)");
  });

  it("returns no strengths or caveats when every score is merely solid", () => {
    const subScores: OpportunitySubScores = {
      momentum: 65,
      dnaFit: 70,
      novelty: 68,
      feasibility: 62,
    };
    expect(listOpportunityStrengths(subScores)).toEqual([]);
    expect(listOpportunityCaveats(subScores)).toEqual([]);
  });
});
