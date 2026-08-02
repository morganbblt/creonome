import { describe, expect, it, vi } from "vitest";
import { Mem0MemoryProvider } from "./mem0-memory.provider.js";

const workspaceId = "0198f3a2-82dd-7000-8000-000000000001";
const creatorProfileId = "0198f3a2-82dd-7000-8000-000000000002";

describe("Mem0MemoryProvider", () => {
  it("searches v3 memories within both creator and workspace scopes", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        results: [
          {
            id: "0198f3a2-82dd-7000-8000-000000000003",
            memory: "Keep hooks understated.",
            score: 0.91,
            metadata: { kind: "creative_preference" },
          },
        ],
      }),
    );
    const provider = new Mem0MemoryProvider(
      { apiKey: "mem0-test-key" },
      request,
    );

    const results = await provider.search({
      query: "How should the hooks feel?",
      workspaceId,
      creatorProfileId,
      topK: 4,
    });

    expect(results).toEqual([
      {
        id: "0198f3a2-82dd-7000-8000-000000000003",
        content: "Keep hooks understated.",
        score: 0.91,
        metadata: { kind: "creative_preference" },
      },
    ]);
    expect(request).toHaveBeenCalledWith(
      "https://api.mem0.ai/v3/memories/search/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token mem0-test-key",
        }),
      }),
    );
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      query: "How should the hooks feel?",
      filters: {
        AND: [
          { user_id: creatorProfileId },
          { app_id: `creonome:${workspaceId}` },
        ],
      },
      top_k: 4,
      threshold: 0.1,
      rerank: false,
    });
  });

  it("stores only an approved memory and preserves its exact wording", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        message: "queued",
        status: "PENDING",
        event_id: "0198f3a2-82dd-7000-8000-000000000004",
      }),
    );
    const provider = new Mem0MemoryProvider(
      { apiKey: "mem0-test-key" },
      request,
    );

    const result = await provider.remember({
      content: "Never use fake urgency.",
      kind: "creative_boundary",
      workspaceId,
      creatorProfileId,
      candidateId: "0198f3a2-82dd-7000-8000-000000000005",
    });

    expect(result).toEqual({
      status: "pending",
      eventId: "0198f3a2-82dd-7000-8000-000000000004",
    });
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      messages: [{ role: "user", content: "Never use fake urgency." }],
      user_id: creatorProfileId,
      app_id: `creonome:${workspaceId}`,
      metadata: {
        workspace_id: workspaceId,
        candidate_id: "0198f3a2-82dd-7000-8000-000000000005",
        kind: "creative_boundary",
      },
      infer: false,
    });
  });

  it("does not leak provider response bodies through errors", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"detail":"secret upstream diagnostic"}', {
        status: 401,
      }),
    );
    const provider = new Mem0MemoryProvider(
      { apiKey: "mem0-test-key" },
      request,
    );

    await expect(
      provider.search({
        query: "preferences",
        workspaceId,
        creatorProfileId,
      }),
    ).rejects.toThrow("Mem0 search failed with status 401");
  });
});
