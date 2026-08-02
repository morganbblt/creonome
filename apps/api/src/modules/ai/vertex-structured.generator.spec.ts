import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { VertexStructuredGenerator } from "./vertex-structured.generator.js";

const ConceptSchema = z.object({
  title: z.string(),
  score: z.number().int().min(0).max(100),
});

describe("VertexStructuredGenerator", () => {
  it("requests schema-constrained JSON and validates the response", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"title":"Warehouse hush","score":92}',
    });
    const generator = new VertexStructuredGenerator(
      { models: { generateContent } },
      "gemini-3.5-flash",
    );
    const jsonSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        score: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["title", "score"],
      additionalProperties: false,
    };

    const result = await generator.generate({
      prompt: "Create one restrained concept.",
      schema: ConceptSchema,
      jsonSchema,
    });

    expect(result).toEqual({ title: "Warehouse hush", score: 92 });
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-3.5-flash",
      contents: "Create one restrained concept.",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        temperature: 0.3,
      },
    });
  });

  it("rejects empty model output", async () => {
    const generator = new VertexStructuredGenerator(
      { models: { generateContent: vi.fn().mockResolvedValue({}) } },
      "gemini-3.5-flash",
    );

    await expect(
      generator.generate({
        prompt: "Create one concept.",
        schema: ConceptSchema,
        jsonSchema: { type: "object" },
      }),
    ).rejects.toThrow("no structured output");
  });
});
