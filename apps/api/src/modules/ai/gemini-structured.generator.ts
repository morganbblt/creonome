import { z } from "zod";
import type {
  GenerateStructuredInput,
  StructuredGenerator,
} from "./structured-generator.js";

type GeminiConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
};

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .min(1),
});

export class GeminiStructuredGenerator implements StructuredGenerator {
  private readonly baseUrl: string;

  constructor(
    private readonly config: GeminiConfig,
    private readonly request: typeof fetch = globalThis.fetch,
  ) {
    this.baseUrl = (
      config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
  }

  async generate<Output>(
    input: GenerateStructuredInput<Output>,
  ): Promise<Output> {
    const response = await this.request(
      `${this.baseUrl}/models/${encodeURIComponent(this.config.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input.prompt }] }],
          generationConfig: {
            responseFormat: {
              text: {
                // The generateContent REST API expects the enum value here.
                // Client SDKs accept the human-readable MIME string instead.
                mimeType: "APPLICATION_JSON",
                schema: input.jsonSchema,
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Gemini generation failed with status ${response.status}`,
      );
    }

    const payload = GeminiResponseSchema.parse(await response.json());
    const text = payload.candidates[0]?.content.parts
      .map((part) => part.text ?? "")
      .join("");

    if (!text) {
      throw new Error("Gemini generation returned no structured output");
    }

    return input.schema.parse(JSON.parse(text));
  }
}
