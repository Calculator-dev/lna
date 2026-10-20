import { getPublicCatalogue } from "../services/public-catalogue.js"
import { imageUrl } from "../services/backblaze.js"
import { catalogJpeg } from "../services/image-processing.js"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { randomBytes } from "node:crypto"
import { inArray, sql, eq, and, isNotNull, isNull } from "drizzle-orm"
import { db } from "../db/client.js"
import { categories, products, customers, orders, orderItems, mediaAssets, productVariants } from "../db/schema.js"
import { queueEmail, wakeEmailWorker } from "../services/email-outbox.js"
import { shippingFor } from "../lib/shipping.js"
import { publicVariants } from "../lib/variants.js"
import { publicInquiryRoutes } from "./inquiries.js"
import { publicFormRateLimit } from "../lib/rate-limits.js"
import { attributionInput } from "../lib/attribution.js"

const localeSchema = z.enum(["bs", "en"]).default("bs")

export function createOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replaceAll("-", "")
  const suffix = randomBytes(4).toString("hex").toUpperCase()
  return `LNA-${date}-${suffix}`
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.register(publicInquiryRoutes)
  const variantsFor = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, Array<typeof productVariants.$inferSelect>>()
    const rows = await db.select().from(productVariants).where(inArray(productVariants.productId, ids))
    const grouped = new Map<string, Array<typeof productVariants.$inferSelect>>()
    for (const row of rows) {
      const list = grouped.get(row.productId)
      if (list) list.push(row)
      else grouped.set(row.productId, [row])
    }
    return grouped
  }

  app.get("/catalogue", async (_request, reply) => {
    reply.header("Cache-Control", "no-store")
    return getPublicCatalogue()
  })
  app.get("/media/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNotNull(mediaAssets.productId))).limit(1)
    if (!asset) return reply.code(404).send({ message: "Image not found" })
    reply.header("Cache-Control", "no-store")
    return reply.redirect(await imageUrl(asset.storageKey))
  })
  // JPEG copies for Meta and Google product catalogs, e.g. /public/catalog-images/<id>.jpg.
  // Stored photos are WebP, which those catalogs reject.
  app.get("/catalog-images/:file", async (request, reply) => {
    const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i.exec((request.params as { file: string }).file)
    if (!match) return reply.code(404).send({ message: "Image not found" })
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, match[1]!), isNotNull(mediaAssets.productId))).limit(1)
    if (!asset) return reply.code(404).send({ message: "Image not found" })
    const source = await fetch(await imageUrl(asset.storageKey), { signal: AbortSignal.timeout(15000) })
    if (!source.ok) return reply.code(502).send({ message: "Image unavailable" })
    const jpeg = await catalogJpeg(Buffer.from(await source.arrayBuffer()))
    // Photos never change under the same ID, so catalog crawlers may cache them.
    reply.header("Cache-Control", "public, max-age=86400")
    return reply.type("image/jpeg").send(jpeg)
  })
  app.get("/categories", async (request) => {
    const locale = localeSchema.parse((request.query as { locale?: string }).locale)
    return (await db.select().from(categories)).map((category) => ({
      id: category.id,
      ...category.translations[locale],
    }))
  })

  app.get("/products", async (request) => {
    const locale = localeSchema.parse((request.query as { locale?: string }).locale)
    const rows = await db.select().from(products).where(isNull(products.archivedAt))
    const byProduct = await variantsFor(rows.map(product => product.id))
    return rows.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      sku: product.sku,
      type: product.type,
      material: product.material,
      featured: product.featured,
      customizable: product.customizable,
      priceMinor: product.priceMinor,
      dimensions: product.dimensions,
      leadTime: product.leadTime[locale],
      stockLabel: product.stockLabel[locale],
      variants: publicVariants(product, byProduct.get(product.id)),
      ...product.translations[locale],
    }))
  })

  app.get("/products/:slug", async (request, reply) => {
    const params = z.object({ slug: z.string().min(1) }).parse(request.params)
    const locale = localeSchema.parse((request.query as { locale?: string }).locale)
    const [product] = await db.select().from(products).where(and(isNull(products.archivedAt), sql`${products.translations}->${locale}->>'slug' = ${params.slug}`)).limit(1)

    if (!product) {
      return reply.code(404).send({ message: "Product not found" })
    }

    const rows = await db.select().from(productVariants).where(eq(productVariants.productId, product.id))

    return {
      id: product.id,
      categoryId: product.categoryId,
      sku: product.sku,
      type: product.type,
      material: product.material,
      featured: product.featured,
      customizable: product.customizable,
      priceMinor: product.priceMinor,
      dimensions: product.dimensions,
      leadTime: product.leadTime[locale],
      stockLabel: product.stockLabel[locale],
      variants: publicVariants(product, rows),
      ...product.translations[locale],
    }
  })

  // Optional header: a retried checkout with the same key gets the original order back
  // instead of creating a duplicate (double clicks, lost responses).
  const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,80}$/).optional()

  const receipt = (order: typeof orders.$inferSelect, subtotalMinor: number) => ({
    ok: true,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotalMinor,
    shippingAmountMinor: order.shippingAmountMinor,
    totalMinor: subtotalMinor + order.shippingAmountMinor,
    message: "Manual confirmation pending",
  })
  // The receipt of an order already placed with this key. No email is sent again.
  async function replayedReceipt(idempotencyKey: string) {
    const [order] = await db.select().from(orders).where(eq(orders.idempotencyKey, idempotencyKey)).limit(1)
    if (!order) return undefined
    const items = await db.select({ unitPriceMinor: orderItems.unitPriceMinor, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, order.id))
    return { ...receipt(order, items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0)), replayed: true }
  }

  app.post("/orders", { config: { rateLimit: publicFormRateLimit } }, async (request, reply) => {
    const idempotencyKey = idempotencyKeySchema.parse(request.headers["idempotency-key"])
    // Limits mirror the database column sizes so oversized input is a 400, not a 500.
    const payload = z.object({
      locale: localeSchema,
      customer: z.object({
        fullName: z.string().trim().min(2).max(160),
        email: z.string().trim().email().max(190),
        phone: z.string().trim().max(60).optional(),
      }),
      shipping: z.object({
        address: z.string().trim().min(3).max(300),
        city: z.string().trim().min(2).max(120),
        postalCode: z.string().trim().max(20).optional(),
        country: z.string().trim().min(2).max(80),
      }),
      notes: z.string().trim().max(2000).optional(),
      attribution: attributionInput,
      items: z.array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid().optional(),
          quantity: z.number().int().positive().max(1000),
          personalization: z.string().trim().max(500).optional(),
        }),
      ).min(1).max(100),
    }).parse(request.body)

    if (idempotencyKey) {
      const replay = await replayedReceipt(idempotencyKey)
      if (replay) return reply.code(200).send(replay)
    }

    const orderNumber = createOrderNumber()
    const placeOrder = () => db.transaction(async (tx) => {
      const selected = await tx.select().from(products).where(and(isNull(products.archivedAt), inArray(products.id, payload.items.map((item) => item.productId)))).for("share")
      const byId = new Map(selected.map((product) => [product.id, product]))
      const variantIds = payload.items.flatMap(item => item.variantId ? [item.variantId] : [])
      const selectedVariants = variantIds.length
        ? await tx.select().from(productVariants).where(inArray(productVariants.id, variantIds)).for("share")
        : []
      const variantsById = new Map(selectedVariants.map(variant => [variant.id, variant]))
      const lines = payload.items.map(item => {
        const product = byId.get(item.productId)
        if (!product) throw app.httpErrors.badRequest("Unknown product")
        if (item.personalization && !product.customizable) throw app.httpErrors.badRequest("Product cannot be personalized")
        const variant = item.variantId ? variantsById.get(item.variantId) : undefined
        if (item.variantId) {
          if (!variant || variant.productId !== product.id) throw app.httpErrors.badRequest("Unknown product variant")
          if (!variant.active) throw app.httpErrors.badRequest("Selected variant is no longer available")
        }
        return {
          item,
          product,
          variant,
          name: product.translations[payload.locale]?.name ?? product.translations.bs?.name ?? product.sku,
          unitPriceMinor: variant?.priceMinor ?? product.priceMinor,
        }
      })
      const subtotalMinor = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.item.quantity, 0)
      const shippingAmountMinor = shippingFor(subtotalMinor)
      const [customer] = await tx.insert(customers).values(payload.customer).returning()
      const [order] = await tx.insert(orders).values({
        orderNumber, locale: payload.locale, customerId: customer.id,
        shippingAddress: payload.shipping, notes: payload.notes, attribution: payload.attribution, shippingAmountMinor, idempotencyKey,
      }).returning()
      await tx.insert(orderItems).values(lines.map(line => ({
        orderId: order.id, productId: line.item.productId, variantId: line.variant?.id,
        sku: line.variant?.sku ?? line.product.sku, productName: line.name,
        dimensions: line.variant?.dimensions ?? line.product.dimensions,
        quantity: line.item.quantity, unitPriceMinor: line.unitPriceMinor, personalization: line.item.personalization,
      })))
      const notification = await queueEmail(tx, { kind: "order_confirmation", orderId: order.id, payload: {
        to: payload.customer.email,
        fullName: payload.customer.fullName,
        orderNumber: order.orderNumber,
        locale: payload.locale,
        items: lines.map(line => ({ name: line.name, quantity: line.item.quantity, unitPriceMinor: line.unitPriceMinor })),
        shippingAmountMinor,
        shipping: payload.shipping,
      } })
      return { order, subtotalMinor, notification }
    })

    let result: Awaited<ReturnType<typeof placeOrder>>
    try {
      result = await placeOrder()
    } catch (error) {
      // A concurrent request with the same key won the race: answer with its order.
      const failure = error as { constraint?: string; cause?: { constraint?: string } }
      if (idempotencyKey && (failure.cause?.constraint ?? failure.constraint) === "orders_idempotency_key_unique") {
        const replay = await replayedReceipt(idempotencyKey)
        if (replay) return reply.code(200).send(replay)
      }
      throw error
    }
    if (result.notification.queued) wakeEmailWorker()
    return reply.code(201).send({ ...receipt(result.order, result.subtotalMinor), notification: result.notification })
  })
}
