import type { Metadata } from "next"
import { ShopPage } from "@/components/pages/shop-page"
import { resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getTranslations } from "next-intl/server"
import { createMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "meta" })
  return createMetadata({ locale, path: "/shop", title: t("shop") })
}

export default async function Page({ params }: LocaleParams) {
  const locale = await resolveLocale(params)
  return <ShopPage locale={locale} />
}
