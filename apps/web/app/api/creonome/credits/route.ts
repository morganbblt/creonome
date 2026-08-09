import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function GET(request: Request) {
  return proxyCreonomeRequest(request, "/credits");
}
