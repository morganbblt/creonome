import type { PrivacyState } from "@creonome/contracts";

type PrivacySource = Pick<
  { getPrivacy(): Promise<PrivacyState> },
  "getPrivacy"
>;

export async function loadPrivacy(
  client: PrivacySource,
): Promise<PrivacyState | null> {
  try {
    return await client.getPrivacy();
  } catch {
    return null;
  }
}
