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
      <section className="px-2 pt-2 md:px-4 md:pt-4">
        <div className="relative mx-auto max-w-400 overflow-hidden rounded-4xl bg-primary text-primary-foreground">
          <span className="ornament absolute inset-x-0 bottom-5 block text-primary-foreground/12" aria-hidden />
          <div className="relative mx-auto max-w-375 px-4 pb-16 pt-6 md:px-6 md:pb-20 md:pt-7">
            <nav aria-label={common("home")} className="flex items-center gap-2 text-xs text-primary-foreground/65">
              <Link href={buildPath(locale)} className="transition-colors hover:text-primary-foreground">{common("home")}</Link>
              <span aria-hidden="true">/</span>
              <span className="text-primary-foreground">{t("allProducts")}</span>
            </nav>
            <div className="mt-12 flex flex-wrap items-end justify-between gap-6 md:mt-16">
              <h1 className="font-serif text-6xl leading-[0.9] md:text-8xl">{t("allProducts")}</h1>
              <p className="rounded-full border border-primary-foreground/25 px-4 py-2 text-sm text-primary-foreground/80">{t("productCount", { count: products.length })}</p>
            </div>
          </div>
        </div>
      </section>
      <Suspense fallback={<div className="mx-auto min-h-120 max-w-375 px-4 py-10 md:px-6" />}>
        <ShopClient locale={locale} products={products} categories={categories} />
      </Suspense>
    </>
  )
}
