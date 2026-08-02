import "server-only";
import { getAuth } from "@/src/lib/auth/server";
import { resolveApiBaseUrl } from "./api-base-url";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function isCrossOriginMutation(request: Request): boolean {
  if (safeMethods.has(request.method.toUpperCase())) return false;
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin) return true;
  return request.headers.get("sec-fetch-site") === "cross-site";
}

export async function proxyCreonomeRequest(
  request: Request,
  path: string,
): Promise<Response> {
  if (isCrossOriginMutation(request)) {
    return Response.json(
      { message: "Cross-origin mutation rejected" },
      { status: 403 },
    );
  }
  try {
    const { data, error } = await getAuth().token();
    if (error || !data?.token) {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 },
      );
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
        ...(body
          ? {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }
          : {}),
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
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { message: "Creative service temporarily unavailable" },
      { status: 503 },
    );
  }
}
