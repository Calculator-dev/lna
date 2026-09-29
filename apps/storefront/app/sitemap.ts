import type { MetadataRoute } from "next"
import { getAbsoluteUrl } from "@/lib/seo"
import { getProducts } from "@/lib/catalogue"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "/",
    "/about",
    "/shop",
    "/custom",
    "/en",
    "/en/about",
    "/en/shop",
    "/en/custom",
  ]

  const [bs, en] = await Promise.all([getProducts("bs"), getProducts("en")])
  const productRoutes = [
    ...bs.map((product) => `/product/${product.localizedSlug}`),
    ...en.map((product) => `/en/product/${product.localizedSlug}`),
  ]

  return [...routes, ...productRoutes].map((route) => ({
    url: getAbsoluteUrl(route),
    changeFrequency: route.includes("/product/") ? "weekly" : "daily",
    priority: route === "/" ? 1 : 0.7,
  }))
}
