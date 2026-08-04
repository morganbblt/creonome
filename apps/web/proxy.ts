import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/src/lib/auth/server";

// Local-only escape hatch: lets you open authenticated pages on localhost
// without a real Neon Auth session, for design/QA review when a database
// isn't configured. Guarded on NODE_ENV so it can never activate in a real
// deployment, and off by default — set NEXT_PUBLIC_DISABLE_AUTH=true in
// .env to turn it on, remove/unset it to go back to real auth.
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

export default function proxy(request: NextRequest) {
  if (DEV_AUTH_BYPASS) return NextResponse.next();
  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/today/:path*",
    "/projects/:path*",
    "/opportunities/:path*",
    "/library/:path*",
    "/creator-dna/:path*",
    "/credits/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
