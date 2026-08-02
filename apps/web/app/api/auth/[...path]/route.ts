import type { NeonAuth } from "@neondatabase/auth/next/server";
import { getAuth } from "@/src/lib/auth/server";

type AuthHandlers = ReturnType<NeonAuth["handler"]>;
type RouteContext = Parameters<AuthHandlers["GET"]>[1];

export function GET(request: Request, context: RouteContext) {
  return getAuth().handler().GET(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return getAuth().handler().POST(request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return getAuth().handler().PUT(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return getAuth().handler().DELETE(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return getAuth().handler().PATCH(request, context);
}
