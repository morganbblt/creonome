import type { CreatorDna } from "@creonome/contracts";

type CreatorDnaSource = Pick<
  { getCreatorDna(): Promise<CreatorDna> },
  "getCreatorDna"
>;

export async function loadCreatorDna(
  client: CreatorDnaSource,
): Promise<CreatorDna | null> {
  try {
    return await client.getCreatorDna();
  } catch {
    return null;
  }
}
