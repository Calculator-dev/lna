"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCart } from "@/components/cart-provider"
import type { CatalogueOffer, ShippingPolicy } from "@/lib/products"

export function CartRepricer({ offers, shipping }: { offers: CatalogueOffer[]; shipping: ShippingPolicy }) {
  const { syncWithCatalogue, lastSync } = useCart()
  const t = useTranslations("cart")

  useEffect(() => {
    syncWithCatalogue(offers, shipping)
  }, [offers, shipping, syncWithCatalogue])

  useEffect(() => {
    if (!lastSync) return
    if (lastSync.removed) toast.warning(t("repricer.removed"))
    if (lastSync.repriced) toast.info(t("repricer.repriced"))
  }, [lastSync, t])

  return null
}
