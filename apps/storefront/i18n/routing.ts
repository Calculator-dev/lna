import { defineRouting } from "next-intl/routing"

// Bosnian is served without a prefix (/shop), English under /en (/en/shop); /bs/... redirects
// to the unprefixed URL. The language comes only from the URL (no cookie or browser detection).
export const routing = defineRouting({
  locales: ["bs", "en"],
  defaultLocale: "bs",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  // Pages set their own hreflang alternates (product slugs differ per language).
  alternateLinks: false,
})
