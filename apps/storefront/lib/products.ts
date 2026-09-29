export type Locale = "bs" | "en"

export type LocalizedField = Record<Locale, string>

/** Product materials. Keep in sync with `materialEnum` in the API schema and the CRM product form. */
export const materials = ["wood", "resin", "mixed"] as const

export type Material = (typeof materials)[number]

export type ProductType = "standard" | "custom"

export type ProductVariant = {
  id: string
  sku: string
  dimensions: string
  price: number
  isDefault?: boolean
  active?: boolean
}

export type SeoFields = {
  title: LocalizedField
  description: LocalizedField
}

export type MediaAsset = {
  id: string
  alt: LocalizedField
  url: string
  width: number
  height: number
  blurDataURL?: string
  storageKey: string
  mimeType: string
}

export type Category = {
  id: string
  slug: LocalizedField
  name: LocalizedField
  description: LocalizedField
  seo: SeoFields
}

export type Product = {
  id: string
  sku: string
  type: ProductType
  featured: boolean
  customizable: boolean
  price: number
  currency: "BAM"
  material: Material
  dimensions: string
  leadTime: LocalizedField
  categoryName?: LocalizedField
  categoryId: string
  stockLabel: LocalizedField
  slug: LocalizedField
  name: LocalizedField
  tagline: LocalizedField
  shortDescription: LocalizedField
  description: LocalizedField
  variants?: ProductVariant[]
  seo: SeoFields
  media: MediaAsset[]
}

export type LocalizedCategory = Category & {
  localizedSlug: string
  localizedName: string
  localizedDescription: string
}

export type LocalizedProduct = Product & {
  localizedSlug: string
  localizedName: string
  localizedTagline: string
  localizedShortDescription: string
  localizedDescription: string
  localizedLeadTime: string
  localizedStockLabel: string
  primaryImage: MediaAsset
}

export type ShippingPolicy = { freeFrom: number; fee: number }

/** Shown before the live policy loads; the API's GET /public/catalogue is authoritative. */
export const defaultShippingPolicy: ShippingPolicy = { freeFrom: 150, fee: 10 }

export function shippingFor(subtotal: number, policy: ShippingPolicy) {
  return subtotal === 0 || subtotal >= policy.freeFrom ? 0 : policy.fee
}

/** Live price data for cart repricing: active variants per product, cheapest first. */
export type CatalogueOffer = {
  productId: string
  variants: Array<Pick<ProductVariant, "id" | "sku" | "dimensions" | "price" | "isDefault">>
}

/**
 * Variants a customer can order, cheapest first, so the lowest price is listed and
 * preselected. Equal prices keep the default variant first, then the CRM order.
 */
export function activeVariants(product: Product): Array<Pick<ProductVariant, "id" | "sku" | "dimensions" | "price" | "isDefault">> {
  const active = product.variants?.filter(variant => variant.active !== false) ?? []
  if (!active.length) return [{ id: `${product.id}-default`, sku: product.sku, dimensions: product.dimensions, price: product.price, isDefault: true }]
  return [...active].sort((a, b) => a.price - b.price || Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)))
}

/** Lowest variant price; "From" is shown when the product's sizes cost different amounts. */
export function displayPrice(product: Product) {
  const variants = activeVariants(product)
  const prices = variants.map(variant => variant.price)
  const amount = Math.min(...prices)
  return { amount, from: new Set(prices).size > 1 }
}

export const locales: Locale[] = ["bs", "en"]

/** next/image only optimizes raster images; SVG placeholders are served as-is. */
export function isSvg(url: string) {
  return url.endsWith(".svg")
}

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value)
}

/** English pages live under /en; everything else is Bosnian. */
export function localeFromPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? "en" : "bs"
}

/** The same page in the other language, keeping the query string. */
export function alternateLocalePath(pathname: string, search = "") {
  const target = localeFromPath(pathname) === "en"
    ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
    : `/en${pathname === "/" ? "" : pathname}`
  return search ? `${target}?${search}` : target
}
export const defaultLocale: Locale = "bs"

export const siteName = "LNA kreativna sehara"

export function getLocalizedField(field: LocalizedField, locale: Locale) {
  return field[locale] ?? field[defaultLocale]
}

export function localizeCategory(category: Category, locale: Locale): LocalizedCategory {
  return {
    ...category,
    localizedSlug: getLocalizedField(category.slug, locale),
    localizedName: getLocalizedField(category.name, locale),
    localizedDescription: getLocalizedField(category.description, locale),
  }
}

export function localizeProduct(product: Product, locale: Locale): LocalizedProduct {
  return {
    ...product,
    localizedSlug: getLocalizedField(product.slug, locale),
    localizedName: getLocalizedField(product.name, locale),
    localizedTagline: getLocalizedField(product.tagline, locale),
    localizedShortDescription: getLocalizedField(product.shortDescription, locale),
    localizedDescription: getLocalizedField(product.description, locale),
    localizedLeadTime: getLocalizedField(product.leadTime, locale),
    localizedStockLabel: getLocalizedField(product.stockLabel, locale),
    primaryImage: product.media[0] ?? { id: "placeholder", url: "/placeholder.svg", width: 800, height: 1000, alt: product.name, storageKey: "", mimeType: "image/svg+xml" },
  }
}

export function formatPrice(amount: number, locale: Locale) {
  const rounded = Math.round(amount)
  const separator = locale === "bs" ? "." : ","
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  const value = `${rounded < 0 ? "-" : ""}${digits}`
  return locale === "bs" ? `${value} KM` : `BAM ${value}`
}

export function buildPath(locale: Locale, path = "") {
  if (locale === "en") {
    return `/en${path}`
  }

  return path || "/"
}

export type CheckoutLineItem = {
  productId: string
  variantId?: string
  quantity: number
  personalization?: string
}

export type OrderPayload = {
  locale: Locale
  customer: {
    fullName: string
    email: string
    phone?: string
  }
  shipping: {
    address: string
    city: string
    postalCode?: string
    country: string
  }
  notes?: string
  items: CheckoutLineItem[]
}

export type OrderResponse = {
  orderNumber: string
  subtotal: number
  shippingAmount: number
  total: number
}

export class OrderError extends Error {}

function browserApiUrl() {
  // Localhost is only a development default; production builds must set NEXT_PUBLIC_API_URL.
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000")).replace(/\/$/, "")
  if (!apiUrl) throw new OrderError("Order service is not configured")
  return apiUrl
}

export async function submitOrder(payload: OrderPayload): Promise<OrderResponse> {
  const response = await fetch(`${browserApiUrl()}/public/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => null) as (Partial<OrderResponse> & { message?: string }) | null
  if (!response.ok || !body?.orderNumber) throw new OrderError(body?.message ?? "Order submission failed")
  return body as OrderResponse
}

export type InquiryPayload = {
  locale: Locale
  fullName: string
  email: string
  phone?: string
  brief: string
  dimensions?: string
  deadline?: string
}

export async function submitInquiry(payload: InquiryPayload) {
  const response = await fetch(`${browserApiUrl()}/public/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new OrderError(body?.message ?? "Inquiry submission failed")
  }
}
