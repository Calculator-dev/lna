import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PrivacyPage } from "@/components/pages/privacy-page"
import { resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { createMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "meta" })
  return createMetadata({ locale, path: "/privacy", title: t("privacy") })
}

export default async function Page({ params }: LocaleParams) {
  await resolveLocale(params)
  return <PrivacyPage />
}
