import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "1MB",
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "img.freepik.com",
      },
    ],
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
    ];
    if (isDevelopment) scriptSrc.push("'unsafe-eval'");

    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "form-action 'self'",
          "img-src 'self' data: blob: https://cdn.pixabay.com https://img.freepik.com",
          "media-src 'self' blob:",
          "connect-src 'self' https://challenges.cloudflare.com",
          "frame-src https://challenges.cloudflare.com",
          `script-src ${scriptSrc.join(" ")}`,
          "style-src 'self' 'unsafe-inline'",
          "worker-src 'self' blob:",
          ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
        ].join("; "),
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
