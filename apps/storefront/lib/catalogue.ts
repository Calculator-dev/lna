import "server-only"
import { connection } from "next/server"
import { cache } from "react"
import { serverApiUrl } from "./api-url"
import { activeVariants, defaultShippingPolicy, localizeCategory, localizeProduct, type CatalogueOffer, type Category, type Product, type Locale, type ShippingPolicy } from "./products"

type Catalogue = { products: Product[]; categories: Category[]; shipping: ShippingPolicy }

// cache() deduplicates the fetch within one request (metadata, page, related products).
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  // The catalogue is always read at request time so CRM changes appear immediately.
  await connection()
  const response = await fetch(`${serverApiUrl()}/public/catalogue`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error("The product catalogue is temporarily unavailable")
  const data = await response.json() as Catalogue
  return { ...data, shipping: data.shipping ?? defaultShippingPolicy, products: data.products.map(product => ({ ...product, media: product.media.map(image => ({ ...image, url: `/api/media/${image.id}` })) })) }
})
export async function getCartOffers(): Promise<{ offers: CatalogueOffer[]; shipping: ShippingPolicy }> {
  const { products, shipping } = await getCatalogue()
  return {
    shipping,
    offers: products.map(product => ({
      productId: product.id,
      variants: activeVariants(product).map(({ id, sku, dimensions, price, isDefault }) => ({ id, sku, dimensions, price, isDefault })),
    })),
  }
}
export async function getProducts(locale: Locale) {
  return (await getCatalogue()).products.map(product => localizeProduct(product, locale))
}
export async function getCategories(locale: Locale) {
  return (await getCatalogue()).categories.map(category => localizeCategory(category, locale))
}
export async function getProductBySlug(locale: Locale, slug: string) {
  return (await getProducts(locale)).find(product => product.localizedSlug === slug || product.slug.bs === slug || product.slug.en === slug) ?? null
}
export async function getRelatedProducts(locale: Locale, productId: string, limit = 3) {
  const products = await getProducts(locale)
  const current = products.find(product => product.id === productId)
  return current ? products.filter(product => product.id !== productId && product.categoryId === current.categoryId).slice(0, limit) : []
}
