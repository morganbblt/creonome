import type { AssetDetail } from "@creonome/contracts";

type AssetDetailSource = Pick<
  { getAsset(assetId: string): Promise<AssetDetail> },
  "getAsset"
>;

/**
 * Mirrors `loadOpportunityDetail` (apps/web/src/features/opportunities/
 * opportunity-detail-data.ts): `null` covers both "no such asset" and "this
 * asset belongs to another workspace" -- `AssetsService#get` (apps/api/src/
 * modules/assets/assets.service.ts) 404s for both, and the page below turns
 * either into Next's `notFound()` rather than distinguishing them.
 */
export async function loadAssetDetail(
  client: AssetDetailSource,
  assetId: string,
): Promise<{ asset: AssetDetail } | null> {
  try {
    return { asset: await client.getAsset(assetId) };
  } catch {
    return null;
  }
}
