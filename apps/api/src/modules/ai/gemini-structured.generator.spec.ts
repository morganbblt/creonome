import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { GeminiStructuredGenerator } from "./gemini-structured.generator.js";

const ConceptSchema = z.object({
  title: z.string(),
  score: z.number().int().min(0).max(100),
});

describe("GeminiStructuredGenerator", () => {
  it("requests schema-constrained JSON using the current Gemini REST fields", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            content: {
              parts: [{ text: '{"title":"Warehouse hush","score":92}' }],
            },
          },
        ],
      }),
    );
    const generator = new GeminiStructuredGenerator(
      { apiKey: "gemini-test-key", model: "gemini-3.5-flash" },
      request,
    );

    const result = await generator.generate({
      prompt: "Create one restrained concept.",
      schema: ConceptSchema,
      jsonSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["title", "score"],
        additionalProperties: false,
      },
    });

    expect(result).toEqual({ title: "Warehouse hush", score: 92 });
    expect(request).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-goog-api-key": "gemini-test-key",
        }),
      }),
    );
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body.generationConfig).toEqual({
      responseMimeType: "application/json",
      responseJsonSchema: expect.objectContaining({
        required: ["title", "score"],
      }),
    });
  });

  it("rejects model output that does not satisfy the application schema", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          { content: { parts: [{ text: '{"title":"Incomplete"}' }] } },
        ],
      }),
    );
    const generator = new GeminiStructuredGenerator(
      { apiKey: "gemini-test-key", model: "gemini-3.5-flash" },
      request,
    );

    await expect(
      generator.generate({
        prompt: "Create one concept.",
        schema: ConceptSchema,
        jsonSchema: { type: "object" },
      }),
    ).rejects.toThrow();
  });
});
