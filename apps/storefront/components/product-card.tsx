import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, PenLine } from "lucide-react"
import { useTranslations } from "next-intl"
import { materialStyle } from "@/lib/material-style"
import { buildPath, displayPrice, formatPrice, type Locale, type LocalizedProduct, isSvg } from "@/lib/products"
import { cn } from "@/lib/utils"

export function ProductCard({
  locale,
  product,
  priority = false,
  layout = "grid",
}: {
  locale: Locale
  product: LocalizedProduct
  priority?: boolean
  layout?: "grid" | "list"
}) {
  const href = `${buildPath(locale, "/product")}/${product.localizedSlug}`
  const price = displayPrice(product)
  const t = useTranslations("product")
  const shop = useTranslations("shop")
  const common = useTranslations("common")
  const style = materialStyle[product.material]
  const list = layout === "list"

  return (
    // The product name is the card's only link; its ::after stretches over the whole card.
    <article
      className={cn(
        "group relative h-full rounded-[1.4rem] bg-card p-2.5 ring-1 ring-border/80 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-28px_rgba(43,29,20,0.55)] focus-within:ring-2 focus-within:ring-primary",
        list ? "grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]" : "flex flex-col",
      )}
    >
      <div className={cn("relative overflow-hidden rounded-2xl", style.surface, list ? "aspect-square sm:aspect-auto sm:min-h-56" : "aspect-4/5")}>
        <Image
          unoptimized={isSvg(product.primaryImage.url)}
          src={product.primaryImage.url}
          alt={product.primaryImage.alt[locale]}
          fill
          priority={priority}
          sizes={list ? "(min-width: 640px) 240px, 100vw" : "(min-width: 1280px) 25vw, (min-width: 768px) 40vw, 50vw"}
          placeholder={product.primaryImage.blurDataURL ? "blur" : "empty"}
          blurDataURL={product.primaryImage.blurDataURL}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} aria-hidden />
          {common(`materials.${product.material}`)}
        </span>
        {product.featured && (
          <span className="absolute right-3 top-3 flex h-15 w-15 -rotate-12 items-center justify-center rounded-full bg-accent text-center text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-accent-foreground shadow-sm">
            {shop("featured")}
          </span>
        )}
        <span className="absolute bottom-3 right-3 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden>
          <ArrowUpRight className="h-5 w-5" strokeWidth={1.6} />
        </span>
      </div>

      <div className={cn("flex flex-1 flex-col px-2", list ? "justify-center py-3 sm:pr-6" : "pb-2 pt-4")}>
        {product.categoryName?.[locale] && <p className="eyebrow text-muted-foreground">{product.categoryName[locale]}</p>}
        <h3 className={cn("mt-2 font-serif leading-[1.02] text-foreground", list ? "text-3xl md:text-4xl" : "text-[26px]")}>
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-[1.4rem]">
            {product.localizedName}
          </Link>
        </h3>
        <p className={cn("mt-2 text-sm leading-6 text-muted-foreground", !list && "line-clamp-2")}>{product.localizedShortDescription}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="text-lg font-semibold tracking-tight">
            {price.from ? common("from", { price: formatPrice(price.amount, locale) }) : formatPrice(price.amount, locale)}
          </p>
          <p className={cn("inline-flex items-center gap-1.5 text-right text-xs", product.type === "custom" ? "text-primary" : "text-muted-foreground")}>
            {product.type === "custom" && <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {product.type === "custom" ? t("personalizationAvailable") : t("readyToOrder")}
          </p>
        </div>
      </div>
    </article>
  )
}
