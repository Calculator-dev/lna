// Shop events for Google Tag Manager, in GA4's recommended ecommerce format
// (https://developers.google.com/analytics/devguides/collection/ga4/ecommerce). GTM forwards
// them to GA4 and any ad tags configured there; see docs/analytics.md. Nothing is sent while
// NEXT_PUBLIC_GTM_ID is unset, and GTM only sets cookies after the visitor accepts them.
// Product views, carts, checkouts, orders and inquiries also go to the Meta Pixel (lib/meta-pixel.ts).

import type { CartItem } from "@/components/cart-provider"
import { metaPixelId, metaTrack } from "@/lib/meta-pixel"
import type { LocalizedProduct, ProductVariant } from "@/lib/products"

type DataLayer = Array<Record<string, unknown> | IArguments>
declare global {
  interface Window { dataLayer?: DataLayer }
}

export const gtmId = process.env.NEXT_PUBLIC_GTM_ID
/** Whether any tracking is configured, and so whether to ask for cookie consent. */
export const trackingEnabled = Boolean(gtmId || metaPixelId)

export type AnalyticsItem = {
  item_id: string
  item_name: string
  item_variant?: string
  item_category?: string
  price: number
  quantity: number
}

/** GA4 amounts are decimal KM; the shop works in feninga. */
const km = (minor: number) => minor / 100

export function productItem(product: LocalizedProduct, variant: Pick<ProductVariant, "sku" | "dimensions" | "priceMinor">, quantity = 1): AnalyticsItem {
  return {
    item_id: variant.sku,
    item_name: product.localizedName,
    item_variant: variant.dimensions,
    item_category: product.categoryName?.bs || undefined,
    price: km(variant.priceMinor),
    quantity,
  }
}

export function cartItem(item: CartItem): AnalyticsItem {
  return {
    item_id: item.variantSku ?? item.productId,
    item_name: item.name,
    item_variant: item.dimensions,
    price: km(item.priceMinor),
    quantity: item.quantity,
  }
}

function push(event: string, ecommerce: Record<string, unknown>) {
  if (!gtmId || typeof window === "undefined") return
  window.dataLayer ??= []
  // Clears the previous event's ecommerce object so values don't leak between events.
  window.dataLayer.push({ ecommerce: null })
  window.dataLayer.push({ event, ecommerce })
}

const totalOf = (items: AnalyticsItem[]) => Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100

/** Meta's standard event parameters for a set of items. */
function metaItems(items: AnalyticsItem[], value = totalOf(items)) {
  return {
    content_type: "product",
    content_ids: items.map(item => item.item_id),
    contents: items.map(item => ({ id: item.item_id, quantity: item.quantity, item_price: item.price })),
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    value,
    currency: "BAM",
  }
}

export const track = {
  viewItemList: (listName: string, items: AnalyticsItem[]) =>
    push("view_item_list", { item_list_name: listName, items: items.slice(0, 50) }),
  viewItem: (item: AnalyticsItem) => {
    push("view_item", { currency: "BAM", value: totalOf([item]), items: [item] })
    metaTrack("ViewContent", { ...metaItems([item]), content_name: item.item_name })
  },
  addToCart: (item: AnalyticsItem) => {
    push("add_to_cart", { currency: "BAM", value: totalOf([item]), items: [item] })
    metaTrack("AddToCart", { ...metaItems([item]), content_name: item.item_name })
  },
  removeFromCart: (item: AnalyticsItem) =>
    push("remove_from_cart", { currency: "BAM", value: totalOf([item]), items: [item] }),
  viewCart: (items: AnalyticsItem[]) =>
    push("view_cart", { currency: "BAM", value: totalOf(items), items }),
  beginCheckout: (items: AnalyticsItem[]) => {
    push("begin_checkout", { currency: "BAM", value: totalOf(items), items })
    metaTrack("InitiateCheckout", metaItems(items))
  },
  purchase: (order: { orderNumber: string; totalMinor: number; shippingAmountMinor: number }, items: AnalyticsItem[]) => {
    push("purchase", { transaction_id: order.orderNumber, currency: "BAM", value: km(order.totalMinor), shipping: km(order.shippingAmountMinor), items })
    // The order number as event ID lets Meta drop a duplicate of the same order.
    metaTrack("Purchase", metaItems(items, km(order.totalMinor)), order.orderNumber)
  },
  generateLead: () => {
    push("generate_lead", { currency: "BAM", value: 0, lead_source: "custom_order_form" })
    metaTrack("Lead", { content_name: "custom_order_form" })
  },
}
