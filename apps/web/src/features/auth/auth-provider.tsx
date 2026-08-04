"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { authClient } from "@/src/lib/auth/client";

type AuthUiClient = ComponentProps<typeof NeonAuthUIProvider>["authClient"];

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      // Neon Auth 0.4 still publishes Better Auth 1.4 structural types. The
      // patched 1.6 runtime keeps the client surface used here compatible.
      authClient={authClient as unknown as AuthUiClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      redirectTo="/onboarding"
      basePath="/auth"
      defaultTheme="system"
      credentials={{ forgotPassword: true }}
      social={{ providers: ["google"] }}
      signUp={{ fields: ["name"] }}
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
