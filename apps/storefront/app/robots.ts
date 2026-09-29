import type { MetadataRoute } from "next"
import { getAbsoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/en/cart", "/en/checkout"],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  }
}
