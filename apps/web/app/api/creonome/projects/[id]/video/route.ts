import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const query = new URL(request.url).search;
  return proxyCreonomeRequest(
    request,
    `/projects/${encodeURIComponent(id)}/video${query}`,
  );
}
