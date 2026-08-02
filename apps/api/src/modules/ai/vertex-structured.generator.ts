import type { GenerateContentParameters } from "@google/genai";
import type {
  GenerateStructuredInput,
  StructuredGenerator,
} from "./structured-generator.js";

type VertexClient = {
  models: {
    generateContent(
      input: GenerateContentParameters,
    ): Promise<{ readonly text?: string }>;
  };
};

export class VertexStructuredGenerator implements StructuredGenerator {
  constructor(
    private readonly client: VertexClient,
    private readonly model: string,
  ) {}

  async generate<Output>(
    input: GenerateStructuredInput<Output>,
  ): Promise<Output> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: input.prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: input.jsonSchema,
        temperature: 0.3,
      },
    });
    if (!response.text) {
      throw new Error("Vertex AI returned no structured output");
    }
    return input.schema.parse(JSON.parse(response.text));
  }
}
