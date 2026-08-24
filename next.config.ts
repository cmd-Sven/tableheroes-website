import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@supabase/supabase-js",
    "@supabase/ssr",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
  ],
  images: {
    // Sharp (installiert) liefert WebP/AVIF über die Image Optimization API
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Next 16: lokale src mit Query-String brauchen explizite localPatterns
    localPatterns: [
      {
        pathname: "/api/achievement-image",
        // search weglassen = beliebige ?file=… Query erlaubt
      },
      {
        pathname: "/images/**",
      },
      {
        pathname: "/videos/**",
      },
    ],
    remotePatterns: [
      // Erlaube alle HTTPS-Verbindungen für flexible Bild-Einbindung
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [25, 50, 75, 85, 90],
  } as any,
};

export default nextConfig;
