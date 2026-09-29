import { CartCatalogueSync } from "@/components/cart-catalogue-sync"
import { CheckoutClient } from "@/components/checkout-client"
import { useTranslations } from "next-intl"
import { PageIntro } from "@/components/page-intro"
import { type Locale } from "@/lib/products"

export function CheckoutPage({ locale }: { locale: Locale }) {
  const t = useTranslations("checkout")
  return (
    <>
      <PageIntro
        eyebrow={t("intro.eyebrow")}
        title={t("intro.title")}
        description={t("intro.description")}
      />
      <CartCatalogueSync />
      <CheckoutClient locale={locale} />
    </>
  )
}
