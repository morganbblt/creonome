import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "@neondatabase/auth-ui/tailwind";
import { AuthProvider } from "@/src/features/auth/auth-provider";
import { Toaster } from "@/src/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Creonome",
    template: "%s · Creonome",
  },
  description:
    "A creative operating system for artists and creators building a high-volume stream of on-DNA vertical content.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {/*
          AuthProvider renders NeonAuthUIProvider, which internally mounts its
          own next-themes ThemeProvider (attribute="class", enableSystem) around
          `children`. next-themes doesn't support nesting two independent
          providers targeting the same <html> element, so this is the single
          theme provider for the whole app — do not add another one here.
        */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
