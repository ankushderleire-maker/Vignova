import type { MetadataRoute } from "next";

// Crawlers may fetch every app URL so that they see the noindex directive
// (the robots meta tag and the X-Robots-Tag header). Disallowing pages here
// would hide that directive and could keep already-indexed login URLs in search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
