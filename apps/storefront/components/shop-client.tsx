"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Grid2X2, List, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useModalPanel } from "@/hooks/use-modal-panel"
import { ProductCard } from "@/components/product-card"
import { materialStyle } from "@/lib/material-style"
import { displayPrice, materials, type Locale, type LocalizedCategory, type LocalizedProduct, type Material, type ProductType } from "@/lib/products"
import { cn } from "@/lib/utils"

type SortKey = "featured" | "name-asc" | "price-asc" | "price-desc"
type ViewMode = "grid" | "list"

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
        {materials.map((value) => (countByMaterial(value) > 0 || material === value) && <FilterOption name={`${id}-material`} key={value} swatch={materialStyle[value].dot} label={common(`materials.${value}`)} count={countByMaterial(value)} checked={material === value} onChange={() => setMaterial(value)} />)}
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
      <div className="relative z-10 -mt-7 flex items-center justify-between gap-2 rounded-full border border-border bg-card p-1.5 pl-2 shadow-[0_18px_40px_-30px_rgba(43,29,20,0.5)] sm:pl-4">
        <div className="flex items-center gap-1 sm:gap-3">
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> {t("filters.title")}{activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">{activeFilterCount}</span>}
          </button>
          <label className="relative flex h-10 items-center gap-2 rounded-full px-3 text-sm hover:bg-secondary">
            <span className="hidden text-muted-foreground sm:inline">{t("sort.label")}:</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="appearance-none bg-transparent pr-6 font-semibold outline-none">
              <option value="featured">{t("sort.featured")}</option>
              <option value="name-asc">{t("sort.nameAsc")}</option>
              <option value="price-asc">{t("sort.priceAsc")}</option>
              <option value="price-desc">{t("sort.priceDesc")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" />
          </label>
        </div>
        <div className="hidden items-center gap-1 rounded-full bg-secondary p-1 sm:flex" role="group" aria-label={t("view.label")}>
          <button type="button" onClick={() => setView("grid")} aria-label={t("view.grid")} aria-pressed={view === "grid"} className={cn("flex h-8 w-9 items-center justify-center rounded-full transition-colors", view === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}><Grid2X2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setView("list")} aria-label={t("view.list")} aria-pressed={view === "list"} className={cn("flex h-8 w-9 items-center justify-center rounded-full transition-colors", view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-6 scrollbar-none md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <CategoryChip active={categoryId === "all"} onClick={() => setCategoryId("all")}>{t("allCategoriesChip")}</CategoryChip>
        {categories.map((category) => <CategoryChip key={category.id} active={categoryId === category.id} onClick={() => setCategoryId(category.id)}>{category.localizedName}</CategoryChip>)}
      </div>

      <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl bg-secondary/70 px-5 py-2">
            {filterPanel("desktop")}
            {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="btn-outline mb-5 min-h-10 w-full">{t("filters.clearFilters")}</button>}
          </div>
        </aside>

        <section>
          <p className="mb-5 text-sm text-muted-foreground">{query ? t("resultsFor", { query: searchParams.get("q") ?? "", count: filtered.length }) : t("showing", { shown: filtered.length, total: products.length })}</p>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-input px-6 py-20 text-center">
              <span className="ornament block w-24 text-accent" aria-hidden />
              <p className="mt-6 font-serif text-3xl">{t("empty")}</p>
              {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="btn-ink mt-6">{t("filters.clearFilters")}</button>}
            </div>
          ) : (
            <div className={cn(view === "grid" ? "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:gap-5 xl:grid-cols-3" : "grid gap-4")}>
              {filtered.map((product, index) => <ProductCard key={product.id} locale={locale} product={product} layout={view} priority={index < 2} />)}
            </div>
          )}
        </section>
      </div>

      <div className={cn("fixed inset-0 z-70 lg:hidden", filtersOpen ? "pointer-events-auto" : "pointer-events-none")} inert={!filtersOpen}>
        <button type="button" tabIndex={-1} aria-hidden onClick={() => setFiltersOpen(false)} className={cn("absolute inset-0 bg-walnut/50 transition-opacity", filtersOpen ? "opacity-100" : "opacity-0")} />
        <div ref={filterDialog} role="dialog" aria-modal="true" aria-label={t("filters.title")} className={cn("absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-4xl bg-background transition-transform duration-300", filtersOpen ? "translate-y-0" : "translate-y-full")}>
          <div className="flex items-center justify-between px-5 pb-2 pt-5"><p className="font-serif text-3xl">{t("filters.title")}</p><button type="button" onClick={() => setFiltersOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary" aria-label={t("filters.close")}><X className="h-5 w-5" aria-hidden /></button></div>
          <div className="flex-1 overflow-y-auto px-5">{filterPanel("mobile")}</div>
          <div className="grid grid-cols-2 gap-3 border-t border-border p-5">
            <button type="button" onClick={resetFilters} className="btn-outline">{t("filters.clear")}</button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary">{t("filters.show", { count: filtered.length })}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors", active ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:border-foreground")}>
      {children}
    </button>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="py-5"><legend className="eyebrow mb-3 text-muted-foreground">{title}</legend><div className="space-y-1">{children}</div></fieldset>
}

function FilterOption({ name, label, count, checked, onChange, swatch }: { name: string; label: string; count: number; checked: boolean; onChange: () => void; swatch?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary", checked ? "bg-card font-semibold shadow-sm" : "hover:bg-card/60")}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className={cn("h-3 w-3 shrink-0 rounded-full border", swatch ?? (checked ? "border-primary bg-primary" : "border-input"), swatch && "border-transparent")} aria-hidden />
      <span className="flex-1">{label}</span><span className="text-xs text-muted-foreground">{count}</span>
    </label>
  )
}
