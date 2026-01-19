import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Erlaube alle HTTPS-Verbindungen für flexible Bild-Einbindung
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
