import { z } from "zod";
import type {
  MemoryProvider,
  MemoryResult,
  MemorySearchInput,
  RememberInput,
  RememberResult,
} from "./memory-provider.js";

type Mem0Config = {
  apiKey: string;
  baseUrl?: string;
};

const SearchResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().min(1),
      memory: z.string(),
      score: z.number().min(0).max(1).default(0),
      metadata: z.record(z.string(), z.unknown()).default({}),
    }),
  ),
});

const RememberResponseSchema = z.object({
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED"]),
  event_id: z.string().min(1),
});

export class Mem0MemoryProvider implements MemoryProvider {
  private readonly baseUrl: string;

  constructor(
    private readonly config: Mem0Config,
    private readonly request: typeof fetch = globalThis.fetch,
  ) {
    this.baseUrl = (config.baseUrl ?? "https://api.mem0.ai").replace(/\/$/, "");
  }

  async search(input: MemorySearchInput): Promise<MemoryResult[]> {
    const response = await this.send("/v3/memories/search/", {
      method: "POST",
      body: JSON.stringify({
        query: input.query,
        filters: {
          AND: [
            { user_id: input.creatorProfileId },
            { app_id: this.workspaceScope(input.workspaceId) },
          ],
        },
        top_k: input.topK ?? 5,
        threshold: 0.1,
        rerank: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mem0 search failed with status ${response.status}`);
    }

    const payload = SearchResponseSchema.parse(await response.json());
    return payload.results.map((memory) => ({
      id: memory.id,
      content: memory.memory,
      score: memory.score,
      metadata: memory.metadata,
    }));
  }

  async remember(input: RememberInput): Promise<RememberResult> {
    const response = await this.send("/v3/memories/add/", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: input.content }],
        user_id: input.creatorProfileId,
        app_id: this.workspaceScope(input.workspaceId),
        metadata: {
          workspace_id: input.workspaceId,
          candidate_id: input.candidateId,
          kind: input.kind,
        },
        infer: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mem0 add failed with status ${response.status}`);
    }

    const payload = RememberResponseSchema.parse(await response.json());
    return {
      status: payload.status.toLowerCase() as RememberResult["status"],
      eventId: payload.event_id,
    };
  }

  async forget(memoryId: string): Promise<void> {
    const response = await this.send(`/v1/memories/${encodeURIComponent(memoryId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Mem0 delete failed with status ${response.status}`);
    }
  }

  private send(path: string, init: RequestInit): Promise<Response> {
    return this.request(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  }

  private workspaceScope(workspaceId: string): string {
    return `creonome:${workspaceId}`;
  }
}
