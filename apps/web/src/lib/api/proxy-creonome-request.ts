import "server-only";
import { getAuth } from "@/src/lib/auth/server";
import { resolveApiBaseUrl } from "./api-base-url";

export async function proxyCreonomeRequest(
  request: Request,
  path: string,
): Promise<Response> {
  const { data, error } = await getAuth().token();
  if (error || !data?.token) {
    return Response.json({ message: "Authentication required" }, { status: 401 });
  }

  const baseUrl = resolveApiBaseUrl(
    process.env.API_URL ?? "http://localhost:4000",
  );
  const body = await request.text();
  const upstream = await fetch(`${baseUrl}${path}`, {
    method: request.method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${data.token}`,
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      ...(request.headers.get("idempotency-key")
        ? { "Idempotency-Key": request.headers.get("idempotency-key")! }
        : {}),
    },
    body: body || undefined,
  });
  const payload = await upstream.text();
  return new Response(payload, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
