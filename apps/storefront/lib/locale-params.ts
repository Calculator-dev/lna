import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { isLocale, locales, type Locale } from "./products"

export type LocaleParams = { params: Promise<{ locale: string }> }

/**
 * Resolves the [locale] segment (proxy.ts only routes "bs" and "en" here) and registers it
 * with next-intl, which keeps pages without request data statically renderable.
 */
export async function resolveLocale(params: LocaleParams["params"]): Promise<Locale> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)
  return locale
}

export function generateLocaleParams() {
  return locales.map(locale => ({ locale }))
}
