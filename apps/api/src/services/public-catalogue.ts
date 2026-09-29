import { db } from "../db/client.js"
import { categories, products, mediaAssets, productVariants } from "../db/schema.js"
import { asc, desc, isNotNull } from "drizzle-orm"
import { shippingPolicy } from "../lib/shipping.js"
import { publicVariants } from "../lib/variants.js"

function localized(rows: Record<string, Record<string, string>>, field: string) {
  return { bs: rows.bs?.[field] ?? "", en: rows.en?.[field] || rows.bs?.[field] || "" }
}
export function catalogueResponse(
  categoryRows: (typeof categories.$inferSelect)[],
  productRows: (typeof products.$inferSelect)[],
  images: (typeof mediaAssets.$inferSelect)[],
  variantRows: (typeof productVariants.$inferSelect)[] = [],
) {
  const categoryNames = new Map(categoryRows.map(row => [row.id, localized(row.translations, "name")]))
  const variantsByProduct = new Map<string, Array<typeof productVariants.$inferSelect>>()
  for (const variant of variantRows) {
    const group = variantsByProduct.get(variant.productId)
    if (group) group.push(variant)
    else variantsByProduct.set(variant.productId, [variant])
  }
  return {
    shipping: shippingPolicy,
    categories: categoryRows.map(row => ({ id: row.id, name: localized(row.translations, "name"), slug: localized(row.translations, "slug"), description: localized(row.translations, "description"), seo: { title: localized(row.seo, "title"), description: localized(row.seo, "description") } })),
    products: productRows.map(row => ({
      variants: publicVariants(row, variantsByProduct.get(row.id)),
      id: row.id, sku: row.sku, categoryId: row.categoryId, categoryName: categoryNames.get(row.categoryId) ?? { bs: "", en: "" },
      type: row.type, material: row.material, featured: row.featured, customizable: row.customizable,
      price: row.price, currency: "BAM" as const, dimensions: row.dimensions,
      leadTime: row.leadTime, stockLabel: row.stockLabel,
      ...Object.fromEntries(["name", "slug", "tagline", "shortDescription", "description"].map(field => [field, localized(row.translations, field)])),
      seo: { title: localized(row.seo, "title"), description: localized(row.seo, "description") },
      media: images.filter(image => image.productId === row.id).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).map(image => ({
        id: image.id, url: `/public/media/${image.id}`, width: image.width, height: image.height,
        alt: { bs: image.alt.bs || row.translations.bs?.name || "", en: image.alt.en || image.alt.bs || row.translations.en?.name || row.translations.bs?.name || "" },
        mimeType: image.mimeType, storageKey: "",
      })),
    })),
  }
}
export async function getPublicCatalogue() {
  const [categoryRows, productRows, images, variantRows] = await Promise.all([
    db.select().from(categories).orderBy(categories.code),
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(mediaAssets).where(isNotNull(mediaAssets.productId)).orderBy(mediaAssets.createdAt),
    db.select().from(productVariants).orderBy(productVariants.productId, asc(productVariants.sortOrder), productVariants.createdAt),
  ])
  return catalogueResponse(categoryRows, productRows, images, variantRows)
}
