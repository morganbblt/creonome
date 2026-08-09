import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetDetailView } from "@/src/features/library/asset-detail-view";
import { loadAssetDetail } from "@/src/features/library/asset-detail-data";
import { createServerApiClient } from "@/src/lib/api/server-client";

export const metadata: Metadata = { title: "Library asset" };

type LibraryAssetPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LibraryAssetPage({
  params,
}: LibraryAssetPageProps) {
  const { id } = await params;
  const result = await loadAssetDetail(createServerApiClient(), id);
  if (!result) {
    notFound();
  }

  return <AssetDetailView asset={result.asset} />;
}
