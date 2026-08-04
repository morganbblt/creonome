import { describe, expect, it } from "vitest";
import { buildHardConstraintsPromptLine } from "./forbidden-constraints.js";

describe("buildHardConstraintsPromptLine", () => {
  it("lists only forbidden-layer trait values", () => {
    const line = buildHardConstraintsPromptLine([
      { layer: "declared", value: "Restrained pacing" },
      { layer: "forbidden", value: "No alcohol brand promotions" },
      { layer: "learned", value: "Avoid loud drops" },
      { layer: "forbidden", value: "No trend imitation" },
    ]);

    expect(line).toBe(
      "Hard constraints, must not violate under any circumstance: No alcohol brand promotions; No trend imitation.",
    );
  });

  it("states there are none declared when no forbidden trait exists", () => {
    const line = buildHardConstraintsPromptLine([
      { layer: "observed", value: "Tape loops" },
    ]);

    expect(line).toBe(
      "Hard constraints, must not violate under any circumstance: none declared.",
    );
  });

  it("handles an empty trait list", () => {
    expect(buildHardConstraintsPromptLine([])).toBe(
      "Hard constraints, must not violate under any circumstance: none declared.",
    );
  });
});
