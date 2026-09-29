import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import {
  buildPath,
  defaultLocale,
  getLocalizedField,
  siteName,
  type Locale,
  type LocalizedField,
} from "@/lib/products"

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://lnakreativnasehara.example"
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, getBaseUrl()).toString()
}

export function createAlternates(path: string) {
  const normalizedPath = path === "/" ? "" : path
  return {
    canonical: getAbsoluteUrl(path || "/"),
    languages: {
      bs: getAbsoluteUrl(path || "/"),
      en: getAbsoluteUrl(buildPath("en", normalizedPath)),
      "x-default": getAbsoluteUrl(path || "/"),
    },
  }
}

export async function createMetadata(args: {
  locale?: Locale
  path: string
  title: string | LocalizedField
  description?: string | LocalizedField
  /** Social preview image path; defaults to the site hero image. */
  image?: string
  /** Keep transactional pages (cart, checkout) out of search results. */
  noIndex?: boolean
}): Promise<Metadata> {
  const locale = args.locale ?? defaultLocale
  const title = typeof args.title === "string" ? args.title : getLocalizedField(args.title, locale)
  const description =
    typeof args.description === "string"
      ? args.description
      : args.description
        ? getLocalizedField(args.description, locale)
        : (await getTranslations({ locale, namespace: "common" }))("siteDescription")
  const canonicalPath = locale === "en" ? buildPath("en", args.path === "/" ? "" : args.path) : args.path

  const image = args.image ?? "/images/hero-lifestyle.jpg"

  return {
    title,
    description,
    ...(args.noIndex ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      ...createAlternates(args.path),
      canonical: getAbsoluteUrl(canonicalPath || "/"),
    },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(canonicalPath || "/"),
      siteName,
      locale: locale === "bs" ? "bs_BA" : "en_US",
      type: "website",
      images: [getAbsoluteUrl(image)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getAbsoluteUrl(image)],
    },
  }
}
