import { describe, expect, it, vi } from "vitest";
import { VertexOnboardingIntelligence } from "./vertex-onboarding.intelligence.js";

const generatedInsight = {
  summary: "A restrained performance built around tactile close-ups.",
  disciplines: ["music performance", "video"],
  genres: ["electronic", "ambient"],
  creativeSignature: "Nocturnal, tactile and deliberately understated.",
  themes: ["process", "anticipation"],
  targetAudience: "Listeners drawn to intimate electronic performance.",
  boundaries: ["No fake urgency"],
  evidence: ["Long pause before the first beat", "Macro needle shot"],
};

describe("VertexOnboardingIntelligence", () => {
  it("analyzes private GCS media with a strict JSON response schema", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(generatedInsight),
    });
    const intelligence = new VertexOnboardingIntelligence(
      { models: { generateContent } },
      "gemini-3.5-flash",
    );

    await expect(
      intelligence.analyze({
        id: "0198f3a2-82dd-7000-8000-000000000060",
        workspaceId: "0198f3a2-82dd-7000-8000-000000000003",
        fileName: "warehouse-take.mov",
        mimeType: "video/quicktime",
        gcsUri: "gs://creonome-media/workspaces/workspace-1/sources/take.mov",
        status: "uploaded",
      }),
    ).resolves.toEqual(generatedInsight);

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.5-flash",
        contents: [
          expect.objectContaining({
            parts: expect.arrayContaining([
              {
                fileData: {
                  fileUri:
                    "gs://creonome-media/workspaces/workspace-1/sources/take.mov",
                  mimeType: "video/quicktime",
                },
              },
            ]),
          }),
        ],
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.objectContaining({ type: "object" }),
        }),
      }),
    );
  });

  it("keeps representativeness labels when synthesizing the draft", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        disciplines: ["music producer"],
        genres: ["electronic"],
        creativeSignature: "Restrained electronic stories with tactile detail.",
        themes: ["process"],
        targetAudience: "Independent electronic listeners.",
        boundaries: ["No fake urgency"],
      }),
    });
    const intelligence = new VertexOnboardingIntelligence(
      { models: { generateContent } },
      "gemini-3.5-flash",
    );

    await intelligence.buildProfile([
      {
        fileName: "warehouse-take.mov",
        representativeness: "not_my_style",
        insight: generatedInsight,
      },
    ]);

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("not_my_style"),
      }),
    );
  });
});
