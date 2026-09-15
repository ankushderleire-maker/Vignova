import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Security Headers */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            // app.vignova.io is the signed-in product; search results belong
            // on vignova.io. "follow" keeps links out of these pages crawlable.
            key: "X-Robots-Tag",
            value: "noindex, follow",
          },
        ],
      },
    ];
  },

  /* Powered-by header removal */
  poweredByHeader: false,
  
  /* Optimize Docker builds */
  output: "standalone",
};

export default nextConfig;
