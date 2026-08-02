import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function POST(request: Request) {
  return proxyCreonomeRequest(request, "/privacy/account-deletion");
}
