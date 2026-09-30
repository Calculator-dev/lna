"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/components/cart-provider"
import { materialStyle } from "@/lib/material-style"
import { activeVariants, formatPrice, type Locale, type LocalizedProduct } from "@/lib/products"
import { cn } from "@/lib/utils"

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
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", materialStyle[product.material].surface)}>
          <span className={cn("h-2.5 w-2.5 rounded-full", materialStyle[product.material].dot)} aria-hidden />
          {materialName}
        </span>
        {product.categoryName?.[locale] && <span className="eyebrow text-muted-foreground">{product.categoryName[locale]}</span>}
      </div>
      <h1 className="mt-5 wrap-break-word font-serif text-5xl leading-[0.95] text-foreground md:text-6xl">{product.localizedName}</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{product.localizedTagline}</p>

      <p className="mt-5 break-all text-xs text-muted-foreground">SKU: <span className="text-foreground">{selectedVariant.sku}</span></p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <p className="text-3xl font-semibold tracking-tight text-foreground">{formatPrice(selectedVariant.price, locale)}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-resin-soft px-3 py-1.5 text-xs font-semibold text-primary"><Check className="h-3.5 w-3.5" />{product.localizedStockLabel}</span>
      </div>

      {variants.length > 1 && (
        <div className="mt-6">
          <p className="field-label mb-3">{t("chooseDimensions")}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map(variant => {
              const active = variant.id === selectedVariant.id
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                  aria-pressed={active}
                  className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", active ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:border-foreground")}
                >
                  {variant.dimensions}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-7 text-sm leading-7 text-foreground/80">{product.localizedDescription}</p>

      <dl className="mt-7 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-secondary px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t("dimensions")}</dt>
          <dd className="mt-1 font-semibold text-foreground">{selectedVariant.dimensions}</dd>
        </div>
        <div className="rounded-2xl bg-secondary px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t("leadTime")}</dt>
          <dd className="mt-1 font-semibold text-foreground">{product.localizedLeadTime}</dd>
        </div>
      </dl>

      {product.customizable && (
        <div className="mt-7">
          <label htmlFor="personalization" className="field-label">
            {t("personalization")}
          </label>
          <textarea
            id="personalization"
            rows={3}
            value={personalization}
            onChange={(event) => setPersonalization(event.target.value)}
            placeholder={t("personalizationPlaceholder")}
            className="field resize-none"
          />
        </div>
      )}

      <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row">
        <div className="inline-flex items-center justify-between rounded-full border border-input bg-card sm:justify-start">
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
          className="btn-primary flex-1"
        >
          {t("addToCart")} · {formatPrice(selectedVariant.price * quantity, locale)}
        </button>
      </div>

      <div className="mt-8 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card px-5 text-sm">
        <details className="group py-4" open><summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden after:float-right after:text-muted-foreground after:content-['+'] group-open:after:content-['–']">{t("details.deliveryTitle")}</summary><p className="mt-3 leading-6 text-muted-foreground">{t("details.deliveryText", { leadTime: product.localizedLeadTime })}</p></details>
        <details className="group py-4"><summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden after:float-right after:text-muted-foreground after:content-['+'] group-open:after:content-['–']">{t("details.careTitle")}</summary><p className="mt-3 whitespace-pre-line leading-6 text-muted-foreground">{product.localizedCare || t("details.careText")}</p></details>
        <details className="group py-4"><summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden after:float-right after:text-muted-foreground after:content-['+'] group-open:after:content-['–']">{t("details.bulkTitle")}</summary><p className="mt-3 leading-6 text-muted-foreground">{t("details.bulkText")}</p></details>
      </div>
    </div>
  )
}
