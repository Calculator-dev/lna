import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

// When the API runs inside the same service (scripts/start-production.mjs), browsers reach it
// through this path on the storefront's own origin, e.g. NEXT_PUBLIC_API_URL=/backend.
// Rewrites are fixed at build time, so the internal address is too.
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? ""
const apiProxyPath = publicApiUrl.startsWith("/") ? publicApiUrl.replace(/\/$/, "") : null
const internalApiUrl = `http://127.0.0.1:${process.env.API_INTERNAL_PORT || "4000"}`

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    if (!apiProxyPath) return []
    // beforeFiles so the locale catch-all page never claims these paths.
    return { beforeFiles: [{ source: `${apiProxyPath}/:path*`, destination: `${internalApiUrl}/:path*` }] }
  },
}

export default withNextIntl(nextConfig)
