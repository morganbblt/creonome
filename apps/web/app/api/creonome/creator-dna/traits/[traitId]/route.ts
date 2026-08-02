import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ traitId: string }> },
) {
  const { traitId } = await params;
  return proxyCreonomeRequest(
    request,
    `/creator-dna/traits/${encodeURIComponent(traitId)}`,
  );
}
