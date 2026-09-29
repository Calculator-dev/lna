import type { ProductDetails, ProductImage, ProductVariant } from "./admin-data"

/** Editable variant row. `key` is client-only; `id` is the saved row's ID, if any. */
export type VariantDraft = {
  key: string
  id?: string
  sku: string
  dimensions: string
  price: string
  active: boolean
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function newVariantDraft(): VariantDraft {
  return { key: crypto.randomUUID(), sku: "", dimensions: "", price: "", active: true }
}

export function variantDrafts(product?: ProductDetails): VariantDraft[] {
  const fromApi: ProductVariant[] = product?.variants?.length
    ? product.variants
    : [{
        id: "primary",
        sku: product?.sku ?? "",
        dimensions: product?.dimensions ?? "",
        price: product?.price ?? 0,
        active: true,
        isDefault: true,
      }]
  return fromApi.map(variant => ({
    key: crypto.randomUUID(),
    // The API reports a synthetic "<product>-default" variant for legacy products; only
    // real row IDs are sent back so the server updates them in place.
    id: uuidPattern.test(variant.id) ? variant.id : undefined,
    sku: variant.sku,
    dimensions: variant.dimensions,
    price: product ? String(variant.price) : "",
    active: variant.active ?? true,
  }))
}

type PayloadInput = {
  form: FormData
  category: string
  images: ProductImage[]
  variants: VariantDraft[]
  mainDimensions: string
}

/** Builds the PUT/POST /admin/products body. English fields fall back to Bosnian. */
export function productPayload({ form, category, images, variants, mainDimensions }: PayloadInput) {
  const text = (name: string) => String(form.get(name) ?? "").trim()
  const localized = (name: string) => ({ bs: text(`${name}.bs`), en: text(`${name}.en`) || text(`${name}.bs`) })
  const translation = (locale: "bs" | "en") => Object.fromEntries(
    ["name", "tagline", "shortDescription", "description"].map(key => [
      key,
      text(`${key}.${locale}`) || (locale === "en" ? text(`${key}.bs`) : ""),
    ]),
  )
  return {
    images: images.map(({ id, alt, isPrimary }) => ({ id, alt, isPrimary })),
    ...(category === "new" ? { newCategory: localized("category") } : { categoryId: category }),
    type: text("type"),
    material: text("material"),
    variants: variants.map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku.trim(),
      dimensions: (index === 0 ? mainDimensions : variant.dimensions).trim(),
      price: Number(variant.price),
      active: variant.active,
    })),
    leadTime: localized("leadTime"),
    stockLabel: localized("stockLabel"),
    featured: form.has("featured"),
    customizable: form.has("customizable"),
    translations: { bs: translation("bs"), en: translation("en") },
  }
}
