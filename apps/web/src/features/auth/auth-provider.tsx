"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/src/lib/auth/client";

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      redirectTo="/today"
      basePath="/auth"
      defaultTheme="light"
      credentials={{ forgotPassword: true }}
      social={{ providers: ["google"] }}
      signUp={{ fields: ["name"] }}
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
