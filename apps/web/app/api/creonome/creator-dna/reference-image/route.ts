import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

export async function PUT(request: Request) {
  return proxyCreonomeRequest(request, "/creator-dna/reference-image");
}

export async function DELETE(request: Request) {
  return proxyCreonomeRequest(request, "/creator-dna/reference-image");
}
