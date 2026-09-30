import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/product-card"
import { Reveal } from "@/components/reveal"
import { getProducts } from "@/lib/catalogue"
import { materialStyle } from "@/lib/material-style"
import { buildPath, siteName, type Locale } from "@/lib/products"
import { cn } from "@/lib/utils"

const categoryTiles = [
  { image: "/images/product-topper.jpg", key: "rahle" },
  { image: "/images/product-wall-decor.jpg", key: "mahrame" },
  { image: "/images/product-photo-stand.jpg", key: "trays" },
  { image: "/images/hero-lifestyle.jpg", key: "decorativeSets" },
  { image: "/images/hero-monogram.jpg", key: "flowers" },
  { image: "/images/product-name-sign.jpg", key: "scarfBouquets" },
  { image: "/images/product-keychain.jpg", key: "paintedScarves" },
] as const

// Bento layout: one tall tile, one wide tile and two small ones.
const showcaseTiles = [
  { image: "/images/product-wall-decor.jpg", key: "space", className: "md:col-span-2 md:row-span-2" },
  { image: "/images/product-name-sign.jpg", key: "name", className: "md:col-span-2" },
  { image: "/images/product-photo-stand.jpg", key: "memories", className: "" },
  { image: "/images/product-topper.jpg", key: "celebrations", className: "" },
] as const

const processSteps = ["define", "prepare", "finish"] as const
const heroMaterials = ["wood", "resin"] as const

export async function HomePage({ locale }: { locale: Locale }) {
  const t = await getTranslations("home")
  const common = await getTranslations("common")
  const process = await getTranslations("process")
  const products = (await getProducts(locale)).slice(0, 4)
  const shopHref = buildPath(locale, "/shop")
  const customHref = buildPath(locale, "/custom")

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-375 items-center gap-12 px-4 pb-16 pt-10 md:px-6 md:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24">
          <Reveal y={18} className="relative z-10">
            <p className="eyebrow flex items-center gap-3 text-primary">
              <span className="h-px w-10 bg-primary" aria-hidden />
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-6 max-w-3xl font-serif text-[56px] leading-[0.92] tracking-[-0.02em] sm:text-7xl lg:text-[104px]">{t("hero.title")}</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{t("hero.description")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={shopHref} className="btn-primary">{t("hero.shopCta")} <ArrowRight className="h-4 w-4" /></Link>
              <Link href={customHref} className="btn-outline">{t("hero.customCta")}</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {heroMaterials.map((material) => (
                <Link key={material} href={`${shopHref}?material=${material}`} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5", materialStyle[material].surface)}>
                  <span className={cn("h-2.5 w-2.5 rounded-full", materialStyle[material].dot)} aria-hidden />
                  {common(`materials.${material}`)}
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal y={24} delay={0.08} className="relative mx-auto w-full max-w-140">
            <div className="absolute -right-2 top-10 bottom-0 left-10 rounded-[2.5rem] bg-primary sm:-right-6 md:-right-10" aria-hidden />
            <div className="arch relative aspect-4/5 overflow-hidden bg-secondary shadow-[0_40px_80px_-40px_rgba(43,29,20,0.6)]">
              <Image src="/images/hero-lifestyle.jpg" alt={t("hero.imageAlt")} fill priority sizes="(min-width: 1024px) 560px, 90vw" className="object-cover" />
            </div>
            <Stamp className="absolute -left-4 bottom-10 h-32 w-32 md:-left-10 md:h-36 md:w-36" />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <span className="ornament block w-28 text-accent" aria-hidden />
            <h2 className="mt-6 font-serif text-5xl leading-[0.98] md:text-6xl">{t("categories.title")}</h2>
            <Link href={shopHref} className="btn-ink mt-8">{t("products.viewAll")} <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <ol className="grid gap-x-8 sm:grid-cols-2">
            {categoryTiles.map((tile, index) => (
              <li key={tile.key}>
                <Link href={shopHref} className="group flex items-center gap-4 border-b border-border py-4">
                  <span className="arch relative h-18 w-14 shrink-0 overflow-hidden bg-secondary">
                    <Image src={tile.image} alt="" fill sizes="56px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  </span>
                  <span className="w-7 text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-serif text-2xl leading-tight transition-colors group-hover:text-primary md:text-[28px]">{t(`categories.tiles.${tile.key}`)}</span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.6} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {products.length > 0 && (
        <section className="mx-auto max-w-375 px-4 pb-16 md:px-6 md:pb-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-muted-foreground">Webshop</p>
              <h2 className="mt-3 font-serif text-5xl leading-none md:text-6xl">{t("products.title")}</h2>
            </div>
            <Link href={shopHref} className="btn-outline">{t("products.viewAll")} <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {products.map((product, index) => <Reveal key={product.id} delay={index * 0.05} className="h-full"><ProductCard locale={locale} product={product} priority={index < 2} /></Reveal>)}
          </div>
        </section>
      )}

      <section className="px-2 pb-16 md:px-4 md:pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-400 overflow-hidden rounded-4xl bg-primary text-primary-foreground md:rounded-[2.75rem]">
            <span className="ornament absolute inset-x-0 top-6 block text-primary-foreground/15" aria-hidden />
            <div className="grid items-center gap-10 px-6 pb-10 pt-16 md:px-12 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-16 lg:pb-16">
              <div>
                <p className="eyebrow text-honey">Custom studio</p>
                <h2 className="mt-5 max-w-xl font-serif text-5xl leading-[0.98] md:text-7xl">{t("customStudio.title")}</h2>
                <p className="mt-6 max-w-lg text-base leading-7 text-primary-foreground/75">{t("customStudio.description")}</p>
                <Link href={customHref} className="btn mt-8 bg-honey text-accent-foreground hover:bg-honey/85">{t("customStudio.cta")} <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="arch relative mx-auto aspect-4/5 w-full max-w-100 overflow-hidden border-8 border-primary-foreground/10">
                <Image src="/images/product-business-sign.jpg" alt={t("customStudio.imageAlt")} fill sizes="(min-width: 1024px) 400px, 80vw" className="object-cover" />
              </div>
            </div>
            <ol className="grid border-t border-primary-foreground/15 md:grid-cols-3">
              {processSteps.map((step, index) => (
                <li key={step} className="flex gap-5 border-primary-foreground/15 px-6 py-7 md:px-10 md:not-last:border-r lg:px-16 max-md:not-last:border-b">
                  <span className="font-serif text-5xl leading-none text-honey">{index + 1}</span>
                  <p className="text-sm leading-6 text-primary-foreground/80">{process(`steps.${step}`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-375 px-4 pb-16 md:px-6 md:pb-24">
        <Reveal className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow text-muted-foreground">{t("showcase.eyebrow")}</p>
            <h2 className="mt-4 max-w-2xl font-serif text-5xl leading-[0.98] md:text-6xl">{t("showcase.title")}</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 md:auto-rows-72.5 md:grid-cols-4 md:gap-5">
          {showcaseTiles.map((tile, index) => (
            <Reveal key={tile.key} delay={index * 0.05} className={cn("h-full", tile.className)}>
              <figure className="group relative h-full min-h-72 overflow-hidden rounded-3xl bg-secondary">
                <Image src={tile.image} alt={t(`showcase.tiles.${tile.key}`)} fill sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"} className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <figcaption className={cn("absolute bottom-4 left-4 right-4 w-fit rounded-2xl bg-card/92 px-4 py-3 font-serif leading-tight backdrop-blur", index === 0 ? "text-3xl" : "text-xl")}>{t(`showcase.tiles.${tile.key}`)}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-375 px-4 pb-20 md:px-6 md:pb-28">
        <div className="grid items-center gap-10 rounded-4xl bg-secondary p-6 md:grid-cols-2 md:gap-16 md:p-12 lg:p-16">
          <div className="relative mx-auto aspect-square w-full max-w-120">
            <div className="absolute inset-[8%] rounded-full bg-honey-soft" aria-hidden />
            <div className="arch relative mx-auto h-full w-4/5 overflow-hidden">
              <Image src="/images/product-keychain.jpg" alt={t("craft.imageAlt")} fill sizes="(min-width: 768px) 380px, 80vw" className="object-cover" />
            </div>
          </div>
          <Reveal>
            <p className="eyebrow text-primary">{t("craft.eyebrow")}</p>
            <h2 className="mt-5 font-serif text-5xl leading-[0.98] md:text-6xl">{t("craft.title")}</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">{t("craft.description")}</p>
            <Link href={customHref} className="btn-ink mt-8">{t("craft.cta")} <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}

/** Circular maker's stamp with the shop name running around the rim. */
function Stamp({ className }: { className?: string }) {
  const text = `${siteName} • Sarajevo • `
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg", className)} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full motion-safe:animate-[spin_24s_linear_infinite]">
        <defs>
          <path id="stamp-circle" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0" />
        </defs>
        <text fontSize="9.2" fontWeight="600" letterSpacing="1.6" fill="currentColor" className="uppercase">
          <textPath href="#stamp-circle" textLength="228">{text.toUpperCase()}</textPath>
        </text>
      </svg>
      <span className="font-serif text-3xl italic">LNA</span>
    </div>
  )
}
