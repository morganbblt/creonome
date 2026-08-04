import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "../../src/features/brand/brand-wordmark";
import { AccountMenu } from "../../src/features/navigation/account-menu";
import { AppNavigation } from "../../src/features/navigation/app-navigation";
import { CreditBalance } from "../../src/features/navigation/credit-balance";
import { createServerApiClient } from "../../src/lib/api/server-client";
import { getAuth } from "../../src/lib/auth/server";

export const dynamic = "force-dynamic";

async function loadAvailableCredits(): Promise<number | null> {
  try {
    return (await createServerApiClient().getCredits()).available;
  } catch {
    return null;
  }
}

type HeaderIdentity = {
  name: string;
  initials: string;
};

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function loadHeaderIdentity(): Promise<HeaderIdentity> {
  try {
    const { data: session } = await getAuth().getSession();
    const name =
      session?.user.name.trim() ||
      session?.user.email.split("@")[0]?.trim() ||
      "Creator";
    return { name, initials: initialsFor(name) };
  } catch {
    return { name: "Creator", initials: "CR" };
  }
}

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [availableCredits, identity] = await Promise.all([
    loadAvailableCredits(),
    loadHeaderIdentity(),
  ]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex min-h-17 items-center gap-7 border-b border-border bg-background/85 px-5.5 backdrop-blur-lg max-[760px]:min-h-15 max-[760px]:gap-4.5 max-[760px]:px-3.5">
        <Link
          href="/today"
          aria-label="Creonome home"
          className="flex items-center max-[520px]:w-[29px] max-[520px]:shrink-0 max-[520px]:overflow-hidden"
        >
          <BrandWordmark className="max-[520px]:w-[134px] max-[520px]:max-w-none" />
        </Link>
        <AppNavigation />
        <div className="ml-auto flex items-center gap-2">
          <CreditBalance initialAvailable={availableCredits} />
          <AccountMenu name={identity.name} initials={identity.initials} />
        </div>
      </header>
      {children}
    </div>
  );
}
