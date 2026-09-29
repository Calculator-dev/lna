// Single source of truth for delivery pricing (whole KM). The storefront reads it from
// GET /public/catalogue so displayed totals match what orders store.
export const shippingPolicy = { freeFrom: 150, fee: 10 } as const

export function shippingFor(subtotal: number) {
  return subtotal === 0 || subtotal >= shippingPolicy.freeFrom ? 0 : shippingPolicy.fee
}
