import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shop runs on one small instance (512 MB) next to the API, and resizing photos is the
  // most memory-hungry thing it does. AVIF needed about twice the memory of WebP and was five
  // times slower, so only WebP is made, at sizes up to 1600 px (the largest photo on a page is
  // the product gallery, about 800 CSS px). Photos never change under the same ID, so resized
  // copies are kept for 30 days. scripts/start-production.mjs also caps how many run at once.
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1200, 1600],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // One libvips thread per resize, reading the source in order: less memory per image.
    imgOptConcurrency: 1,
    imgOptSequentialRead: true,
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }]
  },
}

export default withNextIntl(nextConfig)
