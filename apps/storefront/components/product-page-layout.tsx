import Image from "next/image"
import Link from "next/link"
import { Box, HandHeart, Layers3, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProductCard } from "@/components/product-card"
import { ProductDetail } from "@/components/product-detail"
import { ProductGallery } from "@/components/product-gallery"
import { Reveal } from "@/components/reveal"
import { activeVariants, buildPath, type Locale, type LocalizedProduct, isSvg } from "@/lib/products"
import { cn } from "@/lib/utils"

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
      <div className="mx-auto max-w-375 px-4 pb-16 pt-6 md:px-6 md:pb-24 md:pt-8">
        <nav aria-label={t("breadcrumb")} className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
          <Link href={buildPath(locale)} className="shrink-0 transition-colors hover:text-foreground">{common("home")}</Link>
          <span aria-hidden="true">/</span>
          <Link href={buildPath(locale, "/shop")} className="shrink-0 transition-colors hover:text-foreground">{shop("allProducts")}</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">{product.localizedName}</span>
        </nav>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] xl:gap-14">
          <ProductGallery locale={locale} images={images} material={product.material} />
          <div className="lg:sticky lg:top-28"><ProductDetail locale={locale} product={product} /></div>
        </div>
      </div>

      <section className="px-2 md:px-4">
        <div className="relative mx-auto max-w-400 overflow-hidden rounded-4xl bg-primary px-6 py-20 text-center text-primary-foreground md:rounded-[2.75rem] md:py-28">
          <span className="ornament absolute inset-x-0 top-6 block text-primary-foreground/12" aria-hidden />
          <span className="ornament absolute inset-x-0 bottom-6 block text-primary-foreground/12" aria-hidden />
          <Reveal className="mx-auto max-w-4xl">
            <p className="eyebrow text-honey">{product.categoryName?.[locale] ?? t("collectionFallback")}</p>
            <h2 className="mt-5 font-serif text-5xl leading-[0.98] md:text-7xl">{product.localizedName}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-primary-foreground/75 md:text-lg">{product.localizedDescription}</p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 py-16 md:px-6 md:py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">{t("highlights.eyebrow")}</p>
            <h2 className="mt-4 font-serif text-5xl leading-none md:text-6xl">{t("highlights.title")}</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {highlights.map((highlight, index) => (
            <Reveal key={highlight.title} delay={index * 0.05} className="h-full">
              <div className={cn("h-full rounded-3xl p-6 md:p-7", highlightSurfaces[index])}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card"><highlight.icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <h3 className="mt-8 font-serif text-2xl leading-tight">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{highlight.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 pb-16 md:px-6 md:pb-24">
        <div className="grid items-center gap-10 rounded-4xl bg-secondary p-6 md:grid-cols-2 md:gap-14 md:p-10 lg:p-14">
          <div className="arch relative aspect-4/5 w-full overflow-hidden bg-card">
            <Image unoptimized={isSvg(editorialImage.url)} src={editorialImage.url} alt={editorialImage.alt[locale]} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          </div>
          <Reveal>
            <p className="eyebrow text-primary">{t("finish.eyebrow")}</p>
            <h2 className="mt-5 font-serif text-5xl leading-[0.98] md:text-6xl">{product.localizedTagline || t("finish.titleFallback")}</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">{t("finish.text", { material: materialName })}</p>
            <div className="mt-10">
              <p className="eyebrow text-muted-foreground">{t("specs.eyebrow")}</p>
              <h3 className="mt-2 font-serif text-3xl">{t("specs.title")}</h3>
              <dl className="mt-5 overflow-hidden rounded-2xl bg-card">
                <SpecRow label={t("specs.material")} value={materialName} />
                <SpecRow label={t("dimensions")} value={activeVariants(product).map(variant => variant.dimensions).join(" / ")} />
                <SpecRow label={t("leadTime")} value={product.localizedLeadTime} />
                <SpecRow label="SKU" value={product.sku} />
                <SpecRow label={t("specs.availability")} value={product.localizedStockLabel} />
                <SpecRow label={t("personalization")} value={product.customizable ? t("specs.personalizationAvailable") : t("specs.personalizationUnavailable")} />
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-375 px-4 pb-20 md:px-6 md:pb-28">
          <h2 className="font-serif text-5xl leading-none md:text-6xl">{t("related")}</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {related.map((item) => <ProductCard key={item.id} locale={locale} product={item} />)}
          </div>
        </section>
      )}
    </article>
  )
}

const highlightSurfaces = ["bg-honey-soft", "bg-resin-soft", "bg-clay", "bg-secondary"]

function SpecRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-border/70 px-5 py-4 text-sm last:border-b-0 sm:grid-cols-[170px_1fr] sm:gap-4"><dt className="font-semibold">{label}</dt><dd className="text-muted-foreground">{value}</dd></div>
}
