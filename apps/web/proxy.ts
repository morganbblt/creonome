import type { NextRequest } from "next/server";
import { getAuth } from "@/src/lib/auth/server";

export default function proxy(request: NextRequest) {
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
    "/profile/:path*",
    "/settings/:path*",
  ],
};
