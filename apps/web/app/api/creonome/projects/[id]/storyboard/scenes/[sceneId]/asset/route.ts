import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, sceneId } = await params;
  return proxyCreonomeRequest(
    request,
    `/projects/${encodeURIComponent(id)}/storyboard/scenes/${encodeURIComponent(sceneId)}/asset`,
  );
}
