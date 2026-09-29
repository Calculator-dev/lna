"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/components/cart-provider"
import { activeVariants, formatPrice, type Locale, type LocalizedProduct } from "@/lib/products"

export function ProductDetail({ locale, product }: { locale: Locale; product: LocalizedProduct }) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [personalization, setPersonalization] = useState("")
  const variants = activeVariants(product)
  const [variantId, setVariantId] = useState(() => variants[0]!.id)
  const selectedVariant = variants.find(variant => variant.id === variantId) ?? variants[0]!
  const t = useTranslations("product")
  const common = useTranslations("common")
  const materialName = common(`materials.${product.material}`)

  const handleAdd = () => {
    addItem(product, { quantity, personalization: personalization.trim() || undefined, variantId: selectedVariant.id })
    toast.success(t("addedToCart"))
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {product.categoryName?.[locale] ?? ""} · {materialName}
      </p>
      <h1 className="mt-4 wrap-break-word text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-foreground md:text-5xl">{product.localizedName}</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{product.localizedTagline}</p>

      <p className="mt-5 break-all text-xs text-muted-foreground">SKU: <span className="text-foreground">{selectedVariant.sku}</span></p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <p className="text-3xl font-bold text-foreground">{formatPrice(selectedVariant.price, locale)}</p>
        <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"><Check className="h-3.5 w-3.5" />{product.localizedStockLabel}</span>
      </div>

      {variants.length > 1 && (
        <div className="mt-6">
          <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("chooseDimensions")}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map(variant => {
              const active = variant.id === selectedVariant.id
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                  aria-pressed={active}
                  className={`border px-3 py-2 text-sm transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                >
                  {variant.dimensions}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-7 border-t border-border/60 pt-7 text-sm leading-8 text-foreground/80">{product.localizedDescription}</p>

      <dl className="mt-7 grid gap-5 border-y border-border/60 py-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("dimensions")}</dt>
          <dd className="mt-1 text-foreground">{selectedVariant.dimensions}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("leadTime")}</dt>
          <dd className="mt-1 text-foreground">{product.localizedLeadTime}</dd>
        </div>
      </dl>

      {product.customizable && (
        <div className="mt-7">
          <label htmlFor="personalization" className="block text-sm font-semibold">
            {t("personalization")}
          </label>
          <textarea
            id="personalization"
            rows={3}
            value={personalization}
            onChange={(event) => setPersonalization(event.target.value)}
            placeholder={t("personalizationPlaceholder")}
            className="mt-3 w-full resize-none border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
      )}

      <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row">
        <div className="inline-flex items-center justify-between border border-border sm:justify-start">
          <button type="button" className="flex h-12 w-12 items-center justify-center" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={common("decreaseQuantity")}>
            <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
          <span className="flex h-12 w-12 items-center justify-center text-sm" aria-live="polite">{quantity}</span>
          <button type="button" className="flex h-12 w-12 items-center justify-center" onClick={() => setQuantity((value) => Math.min(1000, value + 1))} aria-label={common("increaseQuantity")}>
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-12 flex-1 bg-foreground px-6 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-foreground/90"
        >
          {t("addToCart")} · {formatPrice(selectedVariant.price * quantity, locale)}
        </button>
      </div>

      <div className="mt-8 divide-y divide-border/60 border-y border-border/60 text-sm">
        <details className="group py-4" open><summary className="cursor-pointer list-none font-semibold">{t("details.deliveryTitle")}</summary><p className="mt-3 leading-6 text-muted-foreground">{t("details.deliveryText", { leadTime: product.localizedLeadTime })}</p></details>
        <details className="group py-4"><summary className="cursor-pointer list-none font-semibold">{t("details.careTitle")}</summary><p className="mt-3 leading-6 text-muted-foreground">{t("details.careText")}</p></details>
        <details className="group py-4"><summary className="cursor-pointer list-none font-semibold">{t("details.bulkTitle")}</summary><p className="mt-3 leading-6 text-muted-foreground">{t("details.bulkText")}</p></details>
      </div>
    </div>
  )
}
