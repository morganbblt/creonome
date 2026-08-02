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

const themeBootstrap = `(()=>{try{const saved=localStorage.getItem("creonome-theme");const system=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=saved==="dark"||saved==="light"?saved:system}catch{document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
