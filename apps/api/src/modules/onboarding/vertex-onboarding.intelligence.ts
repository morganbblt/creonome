import {
  OnboardingAssetInsightSchema,
  OnboardingProfileSchema,
  type OnboardingAssetInsight,
} from "@creonome/contracts";
import type { GenerateContentParameters } from "@google/genai";
import type {
  LabeledOnboardingInsight,
  OnboardingIntelligence,
  OnboardingProfileDraft,
} from "./onboarding-intelligence.js";
import type { OnboardingSourceAssetRecord } from "./onboarding.repository.js";

type VertexClient = {
  models: {
    generateContent(
      input: GenerateContentParameters,
    ): Promise<{ readonly text?: string }>;
  };
};

const stringArrayJsonSchema = {
  type: "array",
  items: { type: "string", minLength: 1, maxLength: 120 },
  maxItems: 12,
};

const insightJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 12, maxLength: 800 },
    disciplines: stringArrayJsonSchema,
    genres: stringArrayJsonSchema,
    creativeSignature: { type: "string", minLength: 8, maxLength: 600 },
    themes: stringArrayJsonSchema,
    targetAudience: { type: "string", minLength: 8, maxLength: 500 },
    boundaries: stringArrayJsonSchema,
    evidence: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: { type: "string", minLength: 3, maxLength: 240 },
    },
  },
  required: [
    "summary",
    "disciplines",
    "genres",
    "creativeSignature",
    "themes",
    "targetAudience",
    "boundaries",
    "evidence",
  ],
  additionalProperties: false,
};

const ProfileDraftSchema = OnboardingProfileSchema.omit({ stageName: true });
const profileDraftJsonSchema = {
  type: "object",
  properties: {
    disciplines: { ...stringArrayJsonSchema, minItems: 1, maxItems: 8 },
    genres: { ...stringArrayJsonSchema, minItems: 1 },
    creativeSignature: { type: "string", minLength: 8, maxLength: 600 },
    themes: { ...stringArrayJsonSchema, minItems: 1 },
    targetAudience: { type: "string", minLength: 8, maxLength: 500 },
    boundaries: stringArrayJsonSchema,
  },
  required: [
    "disciplines",
    "genres",
    "creativeSignature",
    "themes",
    "targetAudience",
    "boundaries",
  ],
  additionalProperties: false,
};

export class VertexOnboardingIntelligence implements OnboardingIntelligence {
  readonly provider = "vertex-ai";

  constructor(
    private readonly client: VertexClient,
    readonly model: string,
  ) {}

  async analyze(
    source: OnboardingSourceAssetRecord,
  ): Promise<OnboardingAssetInsight> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: source.gcsUri,
                mimeType: source.mimeType,
              },
            },
            {
              text: [
                "Analyze this creator-provided source as evidence for a Creator DNA profile.",
                "Observe the media itself, including audio when present.",
                "Separate concrete evidence from cautious interpretation.",
                "Do not infer sensitive personal attributes or promise performance.",
                `Original file name: ${source.fileName}`,
              ].join("\n"),
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: insightJsonSchema,
        temperature: 0.2,
      },
    });
    return OnboardingAssetInsightSchema.parse(
      this.parseResponse(response.text),
    );
  }

  async buildProfile(
    sources: LabeledOnboardingInsight[],
  ): Promise<OnboardingProfileDraft> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        "Synthesize an editable Creator DNA profile from these analyzed sources.",
        "Treat representative sources as primary evidence, reference_only as inspiration, and not_my_style as a negative boundary.",
        "Use concise, specific language and never invent biographical facts.",
        JSON.stringify(sources),
      ].join("\n"),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: profileDraftJsonSchema,
        temperature: 0.25,
      },
    });
    return ProfileDraftSchema.parse(this.parseResponse(response.text));
  }

  private parseResponse(text: string | undefined): unknown {
    if (!text) {
      throw new Error("Vertex AI returned no structured output");
    }
    return JSON.parse(text);
  }
}
