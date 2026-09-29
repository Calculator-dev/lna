import Link from "next/link"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { ShopClient } from "@/components/shop-client"
import { getCategories, getProducts } from "@/lib/catalogue"
import { buildPath, type Locale } from "@/lib/products"

export async function ShopPage({ locale }: { locale: Locale }) {
  const products = await getProducts(locale)
  const categories = await getCategories(locale)
  const t = await getTranslations("shop")
  const common = await getTranslations("common")

  return (
    <>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-375 px-4 pb-20 pt-7 md:px-6 md:pb-28 md:pt-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href={buildPath(locale)} className="transition-colors hover:text-foreground">{common("home")}</Link>
            <span aria-hidden="true">›</span>
            <span className="text-foreground">{t("allProducts")}</span>
          </div>
          <div className="mt-16 flex flex-wrap items-end gap-x-4 gap-y-2 md:mt-20">
            <h1 className="text-5xl font-bold tracking-[-0.045em] md:text-6xl">{t("allProducts")}</h1>
            <p className="pb-1 text-sm text-muted-foreground">{t("productCount", { count: products.length })}</p>
          </div>
        </div>
      </section>
      <Suspense fallback={<div className="mx-auto min-h-120 max-w-375 px-4 py-10 md:px-6" />}>
        <ShopClient locale={locale} products={products} categories={categories} />
      </Suspense>
    </>
  )
}
