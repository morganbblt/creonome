import type { MemoryCandidatesResponse } from "@creonome/contracts";

type MemoryCandidatesSource = Pick<
  { getMemoryCandidates(): Promise<MemoryCandidatesResponse> },
  "getMemoryCandidates"
>;

export async function loadMemoryCandidates(
  client: MemoryCandidatesSource,
): Promise<MemoryCandidatesResponse | null> {
  try {
    return await client.getMemoryCandidates();
  } catch {
    return null;
  }
}
