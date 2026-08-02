import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@creonome/config", "@creonome/contracts"],
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
