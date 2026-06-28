import type { MetadataRoute } from "next";

import { resolveSiteOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = resolveSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
