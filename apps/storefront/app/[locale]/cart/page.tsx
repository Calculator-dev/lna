import type { Metadata } from "next"
import { CartCatalogueSync } from "@/components/cart-catalogue-sync"
import { CartPage } from "@/components/pages/cart-page"
import { resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getTranslations } from "next-intl/server"
import { createMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const t = await getTranslations({ locale, namespace: "meta" })
  return createMetadata({ locale, path: "/cart", title: t("cart"), noIndex: true })
}

export default async function Page({ params }: LocaleParams) {
  const locale = await resolveLocale(params)
  return <>
    <CartCatalogueSync />
    <CartPage locale={locale} />
  </>
}
