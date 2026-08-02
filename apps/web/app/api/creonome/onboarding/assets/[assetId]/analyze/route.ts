import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  return proxyCreonomeRequest(
    request,
    `/onboarding/assets/${encodeURIComponent(assetId)}/analyze`,
  );
}
