import type { Metadata } from "next"
import { SuccessPage } from "@/components/pages/success-page"
import { resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getTranslations } from "next-intl/server"
import { createMetadata } from "@/lib/seo"

type Props = LocaleParams & { searchParams: Promise<{ order?: string }> }

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "meta" })
  return createMetadata({ locale, path: "/checkout/success", title: t("success"), noIndex: true })
}

export default async function Page({ params, searchParams }: Props) {
  const locale = await resolveLocale(params)
  return <SuccessPage locale={locale} orderNumber={(await searchParams).order} />
}
