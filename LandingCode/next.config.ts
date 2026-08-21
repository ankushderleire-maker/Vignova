import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    // Required with `output: 'export'`. Without it next/image emits
    // /_next/image?url=... URLs that no static host can serve — nginx fell
    // through to 404.html and returned it with a 200, so every next/image on
    // the site rendered as a broken image.
    unoptimized: true,
  },
};

export default nextConfig;
