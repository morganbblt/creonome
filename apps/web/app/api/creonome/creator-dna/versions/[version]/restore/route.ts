import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ version: string }> },
) {
  const { version } = await params;
  return proxyCreonomeRequest(
    request,
    `/creator-dna/versions/${encodeURIComponent(version)}/restore`,
  );
}
