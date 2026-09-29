import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/product-card"
import { Reveal } from "@/components/reveal"
import { getProducts } from "@/lib/catalogue"
import { buildPath, type Locale } from "@/lib/products"

const categoryTiles = [
  { image: "/images/product-name-sign.jpg", key: "nameSigns" },
  { image: "/images/product-wall-decor.jpg", key: "wallDecor" },
  { image: "/images/product-topper.jpg", key: "celebrationDecor" },
  { image: "/images/product-photo-stand.jpg", key: "gifts" },
  { image: "/images/product-business-sign.jpg", key: "businessSigns" },
  { image: "/images/product-keychain.jpg", key: "keychains" },
  { image: "/images/product-numbers.jpg", key: "houseNumbers" },
  { image: "/images/hero-monogram.jpg", key: "monograms" },
  { image: "/images/hero-lifestyle.jpg", key: "forHome" },
  { image: "/images/product-business-sign.jpg", key: "yourIdea" },
] as const

const showcaseTiles = [
  { image: "/images/product-wall-decor.jpg", key: "space" },
  { image: "/images/product-name-sign.jpg", key: "name" },
  { image: "/images/product-photo-stand.jpg", key: "memories" },
  { image: "/images/product-topper.jpg", key: "celebrations" },
] as const

export async function HomePage({ locale }: { locale: Locale }) {
  const t = await getTranslations("home")
  const products = (await getProducts(locale)).slice(0, 5)
  const shopHref = buildPath(locale, "/shop")
  const customHref = buildPath(locale, "/custom")

  return (
    <>
      <section className="relative isolate min-h-155 overflow-hidden bg-neutral-950 md:min-h-190">
        <Image src="/images/hero-lifestyle.jpg" alt={t("hero.imageAlt")} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/25 to-black/55" />
        <div className="relative mx-auto flex min-h-155 max-w-7xl items-end px-4 pb-16 pt-28 md:min-h-190 md:items-center md:px-6 md:pb-24">
          <Reveal className="max-w-xl text-white" y={18}>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/75">{t("hero.eyebrow")}</p>
            <h1 className="font-serif text-4xl leading-[0.98] tracking-[-0.035em] min-[390px]:text-5xl sm:text-6xl md:text-7xl">{t("hero.title")}</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/80 md:text-lg">
              {t("hero.description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={shopHref} className="inline-flex min-h-12 items-center bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/85">{t("hero.shopCta")}</Link>
              <Link href={customHref} className="inline-flex min-h-12 items-center border border-white/70 px-6 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black">{t("hero.customCta")}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 py-16 md:px-6 md:py-24">
        <Reveal><h2 className="text-center font-serif text-4xl tracking-tight md:text-5xl">{t("categories.title")}</h2></Reveal>
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-5">
          {categoryTiles.map((tile, index) => (
            <Reveal key={`${tile.key}-${index}`} delay={Math.min(index * 0.035, 0.2)}>
              <Link href={index === categoryTiles.length - 1 ? customHref : shopHref} className="group block">
                <div className="relative aspect-[1.24/1] overflow-hidden bg-muted">
                  <Image src={tile.image} alt={t(`categories.tiles.${tile.key}`)} fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
                </div>
                <p className="mt-3 text-center text-sm font-medium md:text-base">{t(`categories.tiles.${tile.key}`)}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 pb-16 md:px-6 md:pb-24">
        <Reveal>
          <div className="relative min-h-140 overflow-hidden bg-stone-900 md:min-h-162.5">
            <Image src="/images/product-business-sign.jpg" alt={t("customStudio.imageAlt")} fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/20 to-transparent" />
            <div className="relative flex min-h-140 max-w-xl flex-col justify-center p-7 text-white md:min-h-162.5 md:p-16">
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">Custom studio</p>
              <h2 className="mt-5 font-serif text-5xl leading-[1.02] md:text-6xl">{t("customStudio.title")}</h2>
              <p className="mt-6 max-w-md text-base leading-7 text-white/80">{t("customStudio.description")}</p>
              <Link href={customHref} className="mt-8 inline-flex w-fit items-center gap-2 border-b border-white pb-1 text-sm font-semibold">{t("customStudio.cta")} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </Reveal>
      </section>

      {products.length > 0 && (
        <section className="border-y border-border/60 bg-stone-50 py-16 md:py-24">
          <div className="mx-auto max-w-375 px-4 md:px-6">
            <Reveal className="flex items-end justify-between gap-6">
              <div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Webshop</p><h2 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">{t("products.title")}</h2></div>
              <Link href={shopHref} className="hidden items-center gap-2 border-b border-foreground pb-1 text-sm font-medium sm:flex">{t("products.viewAll")} <ArrowRight className="h-4 w-4" /></Link>
            </Reveal>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {products.map((product, index) => <Reveal key={product.id} delay={index * 0.05}><ProductCard locale={locale} product={product} priority={index < 2} /></Reveal>)}
            </div>
            <Link href={shopHref} className="mt-10 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium sm:hidden">{t("products.viewAll")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-375 px-4 py-16 md:px-6 md:py-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("showcase.eyebrow")}</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{t("showcase.title")}</h2>
        </Reveal>
        <div className="mt-10 grid gap-3 md:grid-cols-2 md:gap-5">
          {showcaseTiles.map((tile, index) => (
            <Reveal key={tile.key} delay={(index % 2) * 0.06}>
              <div className="group relative aspect-4/3 overflow-hidden bg-muted">
                <Image src={tile.image} alt={t(`showcase.tiles.${tile.key}`)} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-6 pt-20 text-white"><p className="font-serif text-2xl md:text-3xl">{t(`showcase.tiles.${tile.key}`)}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-[#efe9df]">
        <div className="mx-auto grid max-w-375 md:grid-cols-2">
          <div className="relative min-h-107.5 md:min-h-155"><Image src="/images/hero-monogram.jpg" alt={t("craft.imageAlt")} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /></div>
          <Reveal className="flex items-center px-7 py-16 md:px-16 md:py-20">
            <div className="max-w-lg">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("craft.eyebrow")}</p>
              <h2 className="mt-5 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{t("craft.title")}</h2>
              <p className="mt-6 text-base leading-8 text-foreground/65">{t("craft.description")}</p>
              <Link href={customHref} className="mt-8 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-semibold">{t("craft.cta")} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
