// Single source of truth for delivery pricing, in feninga. The storefront reads it from
// GET /public/catalogue so displayed totals match what orders store.
export const shippingPolicy = { freeFromMinor: 150_00, feeMinor: 11_00 } as const

export function shippingFor(subtotalMinor: number) {
  return subtotalMinor === 0 || subtotalMinor >= shippingPolicy.freeFromMinor ? 0 : shippingPolicy.feeMinor
}
