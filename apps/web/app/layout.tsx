import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@neondatabase/auth-ui/css";
import { AuthProvider } from "@/src/features/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Creonome",
    template: "%s · Creonome",
  },
  description: "A creative operating system for music artists.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
