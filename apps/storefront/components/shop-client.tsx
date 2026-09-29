"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Grid2X2, List, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useModalPanel } from "@/hooks/use-modal-panel"
import { buildPath, displayPrice, formatPrice, materials, type Locale, type LocalizedCategory, type LocalizedProduct, type Material, type ProductType, isSvg } from "@/lib/products"
import { cn } from "@/lib/utils"

type SortKey = "featured" | "name-asc" | "price-asc" | "price-desc"
type ViewMode = "grid" | "list"

function CollectionProductCard({ locale, product, view }: { locale: Locale; product: LocalizedProduct; view: ViewMode }) {
  const t = useTranslations("shop")
  const common = useTranslations("common")
  const href = `${buildPath(locale, "/product")}/${product.localizedSlug}`

  return (
    // In the grid, cards stretch to the row height and the price + button sit at the bottom,
    // so buttons line up regardless of how long names and descriptions are.
    <article className={cn("group", view === "grid" ? "flex h-full flex-col" : "grid gap-5 border-b border-border/60 pb-7 sm:grid-cols-[220px_1fr]")}>
      <Link href={href} className={cn("relative block overflow-hidden bg-[#f4f4f2]", view === "grid" ? "aspect-square" : "aspect-square sm:aspect-4/3")}>
        <Image
          unoptimized={isSvg(product.primaryImage.url)}
          src={product.primaryImage.url}
          alt={product.primaryImage.alt[locale]}
          fill
          sizes={view === "grid" ? "(min-width: 1280px) 25vw, (min-width: 768px) 40vw, 100vw" : "220px"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
        {product.featured && <span className="absolute left-3 top-3 bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{t("featured")}</span>}
      </Link>
      <div className={cn("flex flex-col", view === "grid" ? "flex-1 pt-4" : "justify-center py-1")}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{product.categoryName?.[locale] ?? ""} · {common(`materials.${product.material}`)}</p>
        <Link href={href} className="mt-2 text-base font-semibold leading-snug transition-opacity hover:opacity-60">{product.localizedName}</Link>
        <p className={cn("mt-2 text-sm leading-6 text-muted-foreground", view === "grid" && "line-clamp-2")}>{product.localizedShortDescription}</p>
        <p className={cn("mt-3 text-sm font-semibold", view === "grid" && "mt-auto pt-3")}>{displayPrice(product).from ? common("from", { price: formatPrice(displayPrice(product).amount, locale) }) : formatPrice(displayPrice(product).amount, locale)}</p>
        <Link href={href} className={cn("mt-5 inline-flex h-11 items-center justify-center border border-foreground px-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-foreground hover:text-background sm:px-5 sm:text-xs sm:tracking-[0.12em]", view === "grid" ? "w-full" : "w-fit")}>
          {t("viewProduct")}
        </Link>
      </div>
    </article>
  )
}

export function ShopClient({ locale, products, categories }: { locale: Locale; products: LocalizedProduct[]; categories: LocalizedCategory[] }) {
  const t = useTranslations("shop")
  const common = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Filters live in the URL so header links, back/forward and shared links all agree.
  const requestedMaterial = searchParams.get("material")
  const requestedType = searchParams.get("type")
  const requestedCategory = searchParams.get("category")
  const query = searchParams.get("q")?.trim().toLocaleLowerCase(locale) ?? ""
  const material: "all" | Material = materials.find(value => value === requestedMaterial) ?? "all"
  const productType: "all" | ProductType = requestedType === "standard" || requestedType === "custom" ? requestedType : "all"
  const categoryId = categories.some(category => category.id === requestedCategory) ? requestedCategory! : "all"
  const setFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === "all") next.delete(key)
      else next.set(key, value)
    }
    const search = next.toString()
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
  }
  const setMaterial = (value: "all" | Material) => setFilters({ material: value })
  const setCategoryId = (value: string) => setFilters({ category: value })
  const setProductType = (value: "all" | ProductType) => setFilters({ type: value })
  const [sort, setSort] = useState<SortKey>("featured")
  const [view, setView] = useState<ViewMode>("grid")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterDialog = useModalPanel<HTMLDivElement>(filtersOpen, () => setFiltersOpen(false))

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      if (query && ![product.localizedName, product.localizedShortDescription, product.localizedDescription, product.sku, product.categoryName?.[locale] ?? ""].some(value => value.toLocaleLowerCase(locale).includes(query))) return false
      if (material !== "all" && product.material !== material) return false
      if (categoryId !== "all" && product.categoryId !== categoryId) return false
      if (productType !== "all" && product.type !== productType) return false
      return true
    })

    return [...result].sort((a, b) => {
      if (sort === "name-asc") return a.localizedName.localeCompare(b.localizedName, locale)
      if (sort === "price-asc") return displayPrice(a).amount - displayPrice(b).amount
      if (sort === "price-desc") return displayPrice(b).amount - displayPrice(a).amount
      return Number(b.featured) - Number(a.featured)
    })
  }, [categoryId, locale, material, productType, products, query, sort])

  const countByMaterial = (value: Material) => products.filter((product) => product.material === value).length
  const countByType = (value: ProductType) => products.filter((product) => product.type === value).length
  const countByCategory = (id: string) => products.filter((product) => product.categoryId === id).length
  const activeFilterCount = Number(material !== "all") + Number(categoryId !== "all") + Number(productType !== "all")

  const resetFilters = () => setFilters({ material: "all", category: "all", type: "all" })

  // Rendered in the desktop sidebar and the mobile drawer; `id` keeps radio groups separate.
  const filterPanel = (id: string) => (
    <div className="divide-y divide-border/60">
      <FilterSection title={t("filters.material")}>
        <FilterOption name={`${id}-material`} label={t("filters.allMaterials")} count={products.length} checked={material === "all"} onChange={() => setMaterial("all")} />
        {materials.map((value) => (countByMaterial(value) > 0 || material === value) && <FilterOption name={`${id}-material`} key={value} label={common(`materials.${value}`)} count={countByMaterial(value)} checked={material === value} onChange={() => setMaterial(value)} />)}
      </FilterSection>
      <FilterSection title={t("filters.category")}>
        <FilterOption name={`${id}-category`} label={t("filters.allCategories")} count={products.length} checked={categoryId === "all"} onChange={() => setCategoryId("all")} />
        {categories.map((category) => <FilterOption name={`${id}-category`} key={category.id} label={category.localizedName} count={countByCategory(category.id)} checked={categoryId === category.id} onChange={() => setCategoryId(category.id)} />)}
      </FilterSection>
      <FilterSection title={t("filters.productType")}>
        <FilterOption name={`${id}-type`} label={t("filters.allTypes")} count={products.length} checked={productType === "all"} onChange={() => setProductType("all")} />
        <FilterOption name={`${id}-type`} label={common("productTypes.standard")} count={countByType("standard")} checked={productType === "standard"} onChange={() => setProductType("standard")} />
        <FilterOption name={`${id}-type`} label={common("productTypes.custom")} count={countByType("custom")} checked={productType === "custom"} onChange={() => setProductType("custom")} />
      </FilterSection>
    </div>
  )

  return (
    <div className="mx-auto max-w-375 px-4 pb-20 md:px-6 md:pb-28">
      <div className="flex min-h-22 items-center justify-between gap-5 border-b border-border/60">
        <div className="flex items-center gap-5">
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold lg:hidden">
            {t("filters.title")} <SlidersHorizontal className="h-4 w-4" />{activeFilterCount > 0 && <span>({activeFilterCount})</span>}
          </button>
          <div className="hidden items-center gap-2 text-sm font-semibold lg:flex">{t("filters.title")} <SlidersHorizontal className="h-4 w-4" /></div>
          <div className="hidden h-9 w-px bg-border lg:block" />
          <label className="relative flex items-center gap-3 text-sm">
            <span className="hidden font-semibold sm:inline">{t("sort.label")}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="appearance-none bg-transparent py-2 pr-7 outline-none">
              <option value="featured">{t("sort.featured")}</option>
              <option value="name-asc">{t("sort.nameAsc")}</option>
              <option value="price-asc">{t("sort.priceAsc")}</option>
              <option value="price-desc">{t("sort.priceDesc")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold sm:inline">{t("view.label")}</span>
          <button type="button" onClick={() => setView("list")} aria-label={t("view.list")} className={cn("p-2", view === "list" ? "text-foreground" : "text-muted-foreground")}><List className="h-5 w-5" /></button>
          <button type="button" onClick={() => setView("grid")} aria-label={t("view.grid")} className={cn("p-2", view === "grid" ? "text-foreground" : "text-muted-foreground")}><Grid2X2 className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border/60 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setCategoryId("all")} className={cn("shrink-0 border px-5 py-2.5 text-sm transition-colors", categoryId === "all" ? "border-black bg-black text-white" : "border-border hover:border-foreground")}>{t("allCategoriesChip")}</button>
        {categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={cn("shrink-0 border px-5 py-2.5 text-sm transition-colors", categoryId === category.id ? "border-black bg-black text-white" : "border-border hover:border-foreground")}>{category.localizedName}</button>)}
      </div>

      <div className="grid gap-10 pt-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="mb-5 border-b border-foreground pb-1 text-xs font-semibold uppercase tracking-[0.12em]">{t("filters.clearFilters")}</button>}
            {filterPanel("desktop")}
          </div>
        </aside>

        <section>
          <p className="mb-7 text-xs uppercase tracking-[0.2em] text-muted-foreground">{query ? t("resultsFor", { query: searchParams.get("q") ?? "", count: filtered.length }) : t("showing", { shown: filtered.length, total: products.length })}</p>
          {filtered.length === 0 ? (
            <div className="border-y border-border/60 py-20 text-center">
              <p className="text-lg font-semibold">{t("empty")}</p>
              <button type="button" onClick={resetFilters} className="mt-5 border-b border-foreground pb-1 text-sm">{t("filters.clearFilters")}</button>
            </div>
          ) : (
            <div className={cn(view === "grid" ? "grid grid-cols-2 gap-x-4 gap-y-12 xl:grid-cols-3 xl:gap-x-7" : "grid gap-7")}>
              {filtered.map((product) => <CollectionProductCard key={product.id} locale={locale} product={product} view={view} />)}
            </div>
          )}
        </section>
      </div>

      <div className={cn("fixed inset-0 z-70 lg:hidden", filtersOpen ? "pointer-events-auto" : "pointer-events-none")} inert={!filtersOpen}>
        <button type="button" tabIndex={-1} aria-hidden onClick={() => setFiltersOpen(false)} className={cn("absolute inset-0 bg-black/45 transition-opacity", filtersOpen ? "opacity-100" : "opacity-0")} />
        <div ref={filterDialog} role="dialog" aria-modal="true" aria-label={t("filters.title")} className={cn("absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-background transition-transform duration-300", filtersOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between border-b border-border px-5 py-5"><p className="text-lg font-bold">{t("filters.title")}</p><button type="button" onClick={() => setFiltersOpen(false)} className="p-2" aria-label={t("filters.close")}><X className="h-5 w-5" aria-hidden /></button></div>
          <div className="flex-1 overflow-y-auto px-5">{filterPanel("mobile")}</div>
          <div className="grid grid-cols-2 gap-3 border-t border-border p-5">
            <button type="button" onClick={resetFilters} className="h-12 border border-foreground text-sm font-semibold">{t("filters.clear")}</button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="h-12 bg-foreground text-sm font-semibold text-background">{t("filters.show", { count: filtered.length })}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="py-7"><legend className="mb-5 text-sm font-bold">{title}</legend><div className="space-y-4">{children}</div></fieldset>
}

function FilterOption({ name, label, count, checked, onChange }: { name: string; label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-5 w-5 appearance-none border border-foreground bg-background checked:bg-foreground checked:bg-[linear-gradient(135deg,transparent_42%,white_42%,white_58%,transparent_58%),linear-gradient(45deg,transparent_56%,white_56%,white_68%,transparent_68%)]" />
      <span className="flex-1">{label}</span><span className="text-muted-foreground">({count})</span>
    </label>
  )
}
