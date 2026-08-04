import { redirect } from "next/navigation";
import { LandingPage } from "@/src/features/landing/landing-page";
import { getAuth } from "@/src/lib/auth/server";

// Without this, Next.js has no reason to know the session check depends on
// the request and will happily prerender the landing page once at build
// time — every visitor, signed in or not, would then get served that same
// static HTML forever, and signed-in users would never get redirected.
export const dynamic = "force-dynamic";

async function hasActiveSession(): Promise<boolean> {
  try {
    const { data: session } = await getAuth().getSession();
    return session !== null;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  if (await hasActiveSession()) {
    redirect("/today");
  }

  return <LandingPage />;
}
