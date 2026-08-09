import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return proxyCreonomeRequest(
    request,
    `/projects/${encodeURIComponent(id)}/storyboard/scenes/reorder`,
  );
}
