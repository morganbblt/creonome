import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  CreateOpportunityBatchDto,
  resolveOpportunityDirections,
} from "./create-opportunity-batch.dto.js";

describe("CreateOpportunityBatchDto", () => {
  it("accepts up to three simultaneous creative filters", async () => {
    const input = new CreateOpportunityBatchDto();
    input.directions = ["Closer to my DNA", "More experimental"];

    expect(await validate(input)).toHaveLength(0);
    expect(resolveOpportunityDirections(input)).toBe(
      "Closer to my DNA · More experimental",
    );
  });

  it("rejects an oversized filter list", async () => {
    const input = new CreateOpportunityBatchDto();
    input.directions = ["one", "two", "three", "four"];

    expect(await validate(input)).not.toHaveLength(0);
  });
});
