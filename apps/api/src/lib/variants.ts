import type { products, productVariants } from "../db/schema.js"

type Product = typeof products.$inferSelect
type Variant = typeof productVariants.$inferSelect

/**
 * A product's variants in the shape API clients receive. Products that predate variants
 * get a synthetic default built from the product's own SKU, dimensions and price.
 */
export function publicVariants(product: Product, rows: Variant[] | undefined) {
  const variants = rows?.length
    ? rows
    : [{ id: `${product.id}-default`, sku: product.sku, dimensions: product.dimensions, price: product.price, isDefault: true, active: true }]
  return variants.map(variant => ({
    id: variant.id,
    sku: variant.sku,
    dimensions: variant.dimensions,
    price: variant.price,
    isDefault: variant.isDefault,
    active: variant.active,
  }))
}
