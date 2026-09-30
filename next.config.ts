import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@whiskeysockets/baileys", "pdfkit"],
  experimental: {
    optimizePackageImports: ["drizzle-orm"],
  },
};

export default nextConfig;
