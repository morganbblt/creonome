import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function PUT(request: Request) {
  return proxyCreonomeRequest(request, "/privacy/preferences");
}
