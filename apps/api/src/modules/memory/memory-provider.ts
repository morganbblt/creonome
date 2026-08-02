export type MemorySearchInput = {
  query: string;
  workspaceId: string;
  creatorProfileId: string;
  topK?: number;
};

export type MemoryResult = {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
};

export type RememberInput = {
  content: string;
  kind: string;
  workspaceId: string;
  creatorProfileId: string;
  candidateId: string;
};

export type RememberResult = {
  status: "pending" | "succeeded" | "failed";
  eventId: string;
};

export interface MemoryProvider {
  search(input: MemorySearchInput): Promise<MemoryResult[]>;
  remember(input: RememberInput): Promise<RememberResult>;
  forget(memoryId: string): Promise<void>;
}

export const MEMORY_PROVIDER = Symbol("MEMORY_PROVIDER");
