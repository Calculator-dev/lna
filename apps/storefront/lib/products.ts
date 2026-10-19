import type { Attribution } from "@/lib/attribution"

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
  /** Feninga (1/100 KM), like every amount from the API. */
  priceMinor: number
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
  priceMinor: number
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
  /** Product-specific "Material and care" text; optional, empty for older products. */
  care?: LocalizedField
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
  localizedCare: string
  localizedShortDescription: string
  localizedDescription: string
  localizedLeadTime: string
  localizedStockLabel: string
  primaryImage: MediaAsset
}

export type ShippingPolicy = { freeFromMinor: number; feeMinor: number }

/** Shown before the live policy loads; the API's GET /public/catalogue is authoritative. */
export const defaultShippingPolicy: ShippingPolicy = { freeFromMinor: 150_00, feeMinor: 10_00 }

export function shippingFor(subtotalMinor: number, policy: ShippingPolicy) {
  return subtotalMinor === 0 || subtotalMinor >= policy.freeFromMinor ? 0 : policy.feeMinor
}

/** Live price data for cart repricing: active variants per product, cheapest first. */
export type CatalogueOffer = {
  productId: string
  variants: Array<Pick<ProductVariant, "id" | "sku" | "dimensions" | "priceMinor" | "isDefault">>
}

/**
 * Variants a customer can order, cheapest first, so the lowest price is listed and
 * preselected. Equal prices keep the default variant first, then the CRM order.
 */
export function activeVariants(product: Product): Array<Pick<ProductVariant, "id" | "sku" | "dimensions" | "priceMinor" | "isDefault">> {
  const active = product.variants?.filter(variant => variant.active !== false) ?? []
  if (!active.length) return [{ id: `${product.id}-default`, sku: product.sku, dimensions: product.dimensions, priceMinor: product.priceMinor, isDefault: true }]
  return [...active].sort((a, b) => a.priceMinor - b.priceMinor || Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)))
}

/** Lowest variant price; "From" is shown when the product's sizes cost different amounts. */
export function displayPrice(product: Product) {
  const variants = activeVariants(product)
  const prices = variants.map(variant => variant.priceMinor)
  const amountMinor = Math.min(...prices)
  return { amountMinor, from: new Set(prices).size > 1 }
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
    localizedCare: product.care ? getLocalizedField(product.care, locale) : "",
    localizedShortDescription: getLocalizedField(product.shortDescription, locale),
    localizedDescription: getLocalizedField(product.description, locale),
    localizedLeadTime: getLocalizedField(product.leadTime, locale),
    localizedStockLabel: getLocalizedField(product.stockLabel, locale),
    primaryImage: product.media[0] ?? { id: "placeholder", url: "/placeholder.svg", width: 800, height: 1000, alt: product.name, storageKey: "", mimeType: "image/svg+xml" },
  }
}

/**
 * "1.234 KM" / "12,50 KM" in Bosnian, "BAM 1,234" / "BAM 12.50" in English, from feninga.
 * Built by hand rather than with Intl: browsers without Bosnian locale data would format
 * differently from the server and break hydration.
 */
export function formatPrice(minor: number, locale: Locale) {
  const [thousands, decimal] = locale === "bs" ? [".", ","] : [",", "."]
  const absolute = Math.abs(Math.round(minor))
  const whole = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands)
  const fening = absolute % 100
  const value = `${minor < 0 ? "-" : ""}${whole}${fening ? `${decimal}${String(fening).padStart(2, "0")}` : ""}`
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
  attribution?: Attribution
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
  subtotalMinor: number
  shippingAmountMinor: number
  totalMinor: number
}

export class OrderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

function browserApiUrl() {
  // Localhost is only a development default; production builds must set NEXT_PUBLIC_API_URL.
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000")).replace(/\/$/, "")
  if (!apiUrl) throw new OrderError("Order service is not configured")
  return apiUrl
}

/** Retrying with the same idempotency key returns the original order instead of placing a second one. */
export async function submitOrder(payload: OrderPayload, idempotencyKey: string): Promise<OrderResponse> {
  const response = await fetch(`${browserApiUrl()}/public/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => null) as (Partial<OrderResponse> & { message?: string }) | null
  if (!response.ok || !body?.orderNumber) throw new OrderError(body?.message ?? "Order submission failed", response.status)
  return body as OrderResponse
}

export type InquiryPayload = {
  locale: Locale
  attribution?: Attribution
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
