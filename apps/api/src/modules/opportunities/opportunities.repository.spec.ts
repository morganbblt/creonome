import { describe, expect, it } from "vitest";
import { currentOpportunityStatuses } from "./opportunities.repository.js";

describe("currentOpportunityStatuses", () => {
  it("keeps saved work in the canonical three-card batch", () => {
    expect(currentOpportunityStatuses).toEqual(["available", "saved"]);
  });
});
