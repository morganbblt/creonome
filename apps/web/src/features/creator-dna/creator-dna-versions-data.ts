import type { CreatorDnaVersionsResponse } from "@creonome/contracts";

type CreatorDnaVersionsSource = Pick<
  { getCreatorDnaVersions(): Promise<CreatorDnaVersionsResponse> },
  "getCreatorDnaVersions"
>;

export async function loadCreatorDnaVersions(
  client: CreatorDnaVersionsSource,
): Promise<CreatorDnaVersionsResponse | null> {
  try {
    return await client.getCreatorDnaVersions();
  } catch {
    return null;
  }
}
