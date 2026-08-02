import "server-only";
import { getNeonAccessToken } from "@/src/lib/auth/access-token";
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
    const token = await getNeonAccessToken();
    if (!token) {
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
        Accept: request.headers.get("accept") ?? "application/json",
        Authorization: `Bearer ${token}`,
        ...(body
          ? {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }
          : {}),
        ...(request.headers.get("idempotency-key")
          ? { "Idempotency-Key": request.headers.get("idempotency-key")! }
          : {}),
        ...(request.headers.get("range")
          ? { Range: request.headers.get("range")! }
          : {}),
      },
      body: body || undefined,
    });
    const headers = new Headers();
    for (const name of [
      "content-type",
      "content-length",
      "content-disposition",
      "accept-ranges",
      "content-range",
      "cache-control",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json(
      { message: "Creative service temporarily unavailable" },
      { status: 503 },
    );
  }
}
