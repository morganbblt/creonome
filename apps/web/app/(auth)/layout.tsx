import type { ReactNode } from "react";
import { AuthShell } from "@/src/features/auth/auth-shell";

export default function AuthenticationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AuthShell>{children}</AuthShell>;
}
