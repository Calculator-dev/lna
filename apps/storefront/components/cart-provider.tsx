"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { activeVariants, defaultShippingPolicy, shippingFor, type CatalogueOffer, type LocalizedProduct, type ShippingPolicy } from "@/lib/products"

const STORAGE_KEY = "lna-cart-v1"
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CartItem = {
  lineId: string
  productId: string
  variantId?: string
  variantSku?: string
  dimensions?: string
  slug: string
  name: string
  image: string
  price: number
  quantity: number
  personalization?: string
  type: "standard" | "custom"
}

export type CartSyncResult = { repriced: number; removed: number }

type CartContextValue = {
  items: CartItem[]
  isOpen: boolean
  setOpen: (open: boolean) => void
  addItem: (product: LocalizedProduct, options?: { quantity?: number; personalization?: string; variantId?: string }) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clear: () => void
  /** Reprices stored items from the live catalogue and drops ones that are no longer sold. */
  syncWithCatalogue: (offers: CatalogueOffer[], shipping: ShippingPolicy) => void
  /** Outcome of the latest catalogue sync, or null while one is pending. */
  lastSync: CartSyncResult | null
  totalItems: number
  subtotal: number
  shippingAmount: number
  shippingPolicy: ShippingPolicy
}

const CartContext = createContext<CartContextValue | null>(null)

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.lineId === "string"
    && typeof item.productId === "string"
    && typeof item.slug === "string"
    && typeof item.name === "string"
    && typeof item.image === "string"
    && typeof item.price === "number" && Number.isFinite(item.price)
    && typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0
    && (item.type === "standard" || item.type === "custom")
}

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    // Unavailable storage (private mode, blocked site data) or corrupt JSON: start empty.
    return []
  }
}

function writeStoredCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Quota or privacy restrictions: the cart still works for this page view.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setOpen] = useState(false)
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy>(defaultShippingPolicy)
  const [catalogue, setCatalogue] = useState<CatalogueOffer[] | null>(null)
  const [lastSync, setLastSync] = useState<CartSyncResult | null>(null)
  // Nothing is written until the stored cart has been read, so the initial empty
  // state can never overwrite a saved cart.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readStoredCart())
    setHydrated(true)
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(readStoredCart())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    if (hydrated) writeStoredCart(items)
  }, [hydrated, items])

  // Reprice once both the stored cart and the live catalogue are available.
  useEffect(() => {
    if (!hydrated || !catalogue) return
    const byProduct = new Map(catalogue.map(offer => [offer.productId, offer]))
    let repriced = 0
    let removed = 0
    const next: CartItem[] = []
    for (const item of items) {
      const offer = byProduct.get(item.productId)
      const variant = offer && (item.variantId
        ? offer.variants.find(candidate => candidate.id === item.variantId)
        // Items without a variant ID are charged the product's default variant.
        : offer.variants.find(candidate => candidate.isDefault) ?? offer.variants[0])
      if (!variant) {
        removed++
        continue
      }
      if (variant.price !== item.price) repriced++
      next.push({ ...item, price: variant.price, variantSku: variant.sku, dimensions: variant.dimensions })
    }
    setCatalogue(null)
    setLastSync({ repriced, removed })
    if (repriced || removed) setItems(next)
  }, [hydrated, catalogue, items])

  const syncWithCatalogue = useCallback((offers: CatalogueOffer[], shipping: ShippingPolicy) => {
    setShippingPolicy(shipping)
    setLastSync(null)
    setCatalogue(offers)
  }, [])

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return {
      items,
      isOpen,
      setOpen,
      addItem: (product, options) => {
        const quantity = Math.max(1, options?.quantity ?? 1)
        const personalization = options?.personalization?.trim() || undefined
        const variants = activeVariants(product)
        const selected = variants.find((variant) => variant.id === options?.variantId) ?? variants[0]
        const persistedVariantId = uuidPattern.test(selected.id) ? selected.id : undefined
        const lineId = `${product.id}:${selected.id}:${personalization ?? "base"}`
        setItems((current) => {
          const existing = current.find((item) => item.lineId === lineId)
          if (existing) {
            return current.map((item) =>
              item.lineId === lineId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          }

          return [
            ...current,
            {
              lineId,
              productId: product.id,
              variantId: persistedVariantId,
              variantSku: selected.sku,
              dimensions: selected.dimensions,
              slug: product.localizedSlug,
              name: product.localizedName,
              image: product.primaryImage.url,
              price: selected.price,
              quantity,
              personalization,
              type: product.type,
            },
          ]
        })
        setOpen(true)
      },
      removeItem: (lineId) => {
        setItems((current) => current.filter((item) => item.lineId !== lineId))
      },
      updateQuantity: (lineId, quantity) => {
        setItems((current) =>
          current.map((item) => (item.lineId === lineId ? { ...item, quantity: Math.min(1000, Math.max(1, quantity)) } : item)),
        )
      },
      clear: () => setItems([]),
      syncWithCatalogue,
      lastSync,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shippingAmount: shippingFor(subtotal, shippingPolicy),
      shippingPolicy,
    }
  }, [isOpen, items, lastSync, shippingPolicy, syncWithCatalogue])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used inside CartProvider")
  }

  return context
}
