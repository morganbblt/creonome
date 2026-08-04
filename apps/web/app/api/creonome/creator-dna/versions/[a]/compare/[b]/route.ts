import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ a: string; b: string }> },
) {
  const { a, b } = await params;
  return proxyCreonomeRequest(
    request,
    `/creator-dna/versions/${encodeURIComponent(a)}/compare/${encodeURIComponent(b)}`,
  );
}
