/**
 * Renders a creator's forbidden-layer Creator DNA traits (bible §11.1) as
 * an explicit "must not violate" prompt section.
 *
 * QualityGateService (see quality-gate.service.ts) is the *enforcement*
 * backstop -- it rejects a generation after the fact and releases the
 * reserved credits. This helper is the *prevention* step: every generation
 * prompt that produces creator-facing copy (opportunity ideas, scripts,
 * storyboards) should include it so the model is instructed up front
 * instead of relying solely on post-hoc filtering.
 */
export function buildHardConstraintsPromptLine(
  traits: ReadonlyArray<{ layer: string; value: string }>,
): string {
  const forbidden = traits
    .filter((trait) => trait.layer === "forbidden")
    .map((trait) => trait.value);
  return forbidden.length
    ? `Hard constraints, must not violate under any circumstance: ${forbidden.join("; ")}.`
    : "Hard constraints, must not violate under any circumstance: none declared.";
}
