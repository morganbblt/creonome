import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return proxyCreonomeRequest(request, `/assets/${encodeURIComponent(id)}`);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return proxyCreonomeRequest(request, `/assets/${encodeURIComponent(id)}`);
}
