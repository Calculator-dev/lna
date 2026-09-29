import Image from "next/image"
import Link from "next/link"
import { Box, HandHeart, Layers3, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProductCard } from "@/components/product-card"
import { ProductDetail } from "@/components/product-detail"
import { ProductGallery } from "@/components/product-gallery"
import { Reveal } from "@/components/reveal"
import { activeVariants, buildPath, type Locale, type LocalizedProduct, isSvg } from "@/lib/products"

export function ProductPageLayout({ locale, product, related }: { locale: Locale; product: LocalizedProduct; related: LocalizedProduct[] }) {
  const t = useTranslations("product")
  const shop = useTranslations("shop")
  const common = useTranslations("common")
  const images = product.media.length ? product.media : [product.primaryImage]
  const editorialImage = images[1] ?? images[0]
  const materialName = common(`materials.${product.material}`)

  const highlights = [
    { icon: HandHeart, title: t("highlights.handmadeTitle"), text: t("highlights.handmadeText") },
    { icon: Layers3, title: t("highlights.materialTitle"), text: t(`highlights.materialText.${product.material}`) },
    { icon: Sparkles, title: t("highlights.finishTitle"), text: t("highlights.finishText") },
    { icon: Box, title: t("highlights.packagingTitle"), text: t("highlights.packagingText") },
  ]

  return (
    <article>
      <div className="mx-auto max-w-375 px-4 pb-16 pt-7 md:px-6 md:pb-24 md:pt-8">
        <nav aria-label={t("breadcrumb")} className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
          <Link href={buildPath(locale)} className="shrink-0 transition-colors hover:text-foreground">{common("home")}</Link>
          <span aria-hidden="true">›</span>
          <Link href={buildPath(locale, "/shop")} className="shrink-0 transition-colors hover:text-foreground">{shop("allProducts")}</Link>
          <span aria-hidden="true">›</span>
          <span className="truncate text-foreground">{product.localizedName}</span>
        </nav>

        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] xl:gap-16">
          <ProductGallery locale={locale} images={images} />
          <div className="lg:sticky lg:top-24"><ProductDetail locale={locale} product={product} /></div>
        </div>
      </div>

      <section className="bg-black px-4 py-20 text-center text-white md:px-6 md:py-28">
        <Reveal className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/55">{product.categoryName?.[locale] ?? t("collectionFallback")}</p>
          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.035em] md:text-6xl">{product.localizedName}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 md:text-lg">{product.localizedDescription}</p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-375 px-4 py-16 md:px-6 md:py-24">
        <Reveal className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("highlights.eyebrow")}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.035em] md:text-5xl">{t("highlights.title")}</h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 border-l border-t border-border/60 md:grid-cols-4">
          {highlights.map((highlight, index) => (
            <Reveal key={highlight.title} delay={index * 0.05} className="h-full">
              <div className="h-full border-b border-r border-border/60 px-5 py-8 md:px-7 md:py-10">
                <highlight.icon className="h-6 w-6" strokeWidth={1.4} />
                <h3 className="mt-7 text-base font-bold md:text-lg">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{highlight.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-[#f0ece5]">
        <div className="mx-auto grid max-w-375 md:grid-cols-2">
          <div className="relative min-h-105 md:min-h-170">
            <Image unoptimized={isSvg(editorialImage.url)} src={editorialImage.url} alt={editorialImage.alt[locale]} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          <Reveal className="flex items-center px-7 py-16 md:px-14 lg:px-20">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("finish.eyebrow")}</p>
              <h2 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.035em] md:text-5xl">{product.localizedTagline || t("finish.titleFallback")}</h2>
              <p className="mt-6 text-base leading-8 text-foreground/65">{t("finish.text", { material: materialName })}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("specs.eyebrow")}</p>
          <h2 className="mt-4 text-center text-4xl font-bold tracking-[-0.035em] md:text-5xl">{t("specs.title")}</h2>
          <dl className="mt-12 border-t border-border/60">
            <SpecRow label={t("specs.material")} value={materialName} />
            <SpecRow label={t("dimensions")} value={activeVariants(product).map(variant => variant.dimensions).join(" / ")} />
            <SpecRow label={t("leadTime")} value={product.localizedLeadTime} />
            <SpecRow label="SKU" value={product.sku} />
            <SpecRow label={t("specs.availability")} value={product.localizedStockLabel} />
            <SpecRow label={t("personalization")} value={product.customizable ? t("specs.personalizationAvailable") : t("specs.personalizationUnavailable")} />
          </dl>
        </Reveal>
      </section>

      {related.length > 0 && (
        <section className="border-t border-border/60 bg-stone-50 py-16 md:py-24">
          <div className="mx-auto max-w-375 px-4 md:px-6">
            <h2 className="text-4xl font-bold tracking-[-0.035em] md:text-5xl">{t("related")}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => <ProductCard key={item.id} locale={locale} product={item} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 border-b border-border/60 py-5 text-sm sm:grid-cols-[220px_1fr]"><dt className="font-semibold">{label}</dt><dd className="text-muted-foreground">{value}</dd></div>
}
