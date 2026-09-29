import type { Metadata } from "next"
import { AboutPage } from "@/components/pages/about-page"
import { resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getTranslations } from "next-intl/server"
import { createMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "meta" })
  return createMetadata({ locale, path: "/about", title: t("about") })
}

export default async function Page({ params }: LocaleParams) {
  await resolveLocale(params)
  return <AboutPage />
}
