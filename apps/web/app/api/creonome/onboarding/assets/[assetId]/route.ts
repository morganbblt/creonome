import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  return proxyCreonomeRequest(
    request,
    `/onboarding/assets/${encodeURIComponent(assetId)}`,
  );
}
