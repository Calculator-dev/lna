import type { FastifyPluginAsync } from "fastify"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client.js"
import { customers, mediaAssets, orderItems, orders } from "../db/schema.js"
import { imageUrl } from "../services/backblaze.js"
import { queueEmail, wakeEmailWorker } from "../services/email-outbox.js"
import { beforeCursor, cursorTime, page, pageQuery } from "../lib/pagination.js"

const params = z.object({ id: z.string().uuid() })
const decisionInput = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("accept") }),
  z.object({ decision: z.literal("decline"), reason: z.string().trim().min(5).max(2000) }),
])
const totalMinor = sql<number>`coalesce(sum(${orderItems.unitPriceMinor} * ${orderItems.quantity}), 0) + ${orders.shippingAmountMinor}`.mapWith(Number)

/** Newest first; `before` is a page cursor from a previous page. */
export function orderSummaries(before?: string) {
  return db
    .select({
      id: orders.id, orderNumber: orders.orderNumber, customer: customers.fullName,
      status: orders.status, amountMinor: totalMinor, createdAt: orders.createdAt,
      cursorTime: cursorTime(orders.createdAt),
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(before ? beforeCursor(orders.createdAt, orders.id, before) : undefined)
    .groupBy(orders.id, customers.id)
    .orderBy(desc(orders.createdAt), desc(orders.id))
}

export const orderReviewRoutes: FastifyPluginAsync = async app => {
  app.get("/orders", async (request, reply) => {
    const { limit, before } = pageQuery.parse(request.query)
    const query = orderSummaries(before)
    return page(reply, await (limit ? query.limit(limit + 1) : query), limit)
  })

  app.get("/orders/:id", async (request, reply) => {
    const { id } = params.parse(request.params)
    const [order] = await db
      .select({
        id: orders.id, orderNumber: orders.orderNumber, locale: orders.locale,
        status: orders.status, paymentStatus: orders.paymentStatus,
        shippingAddress: orders.shippingAddress, notes: orders.notes, attribution: orders.attribution,
        shippingAmountMinor: orders.shippingAmountMinor,
        declineReason: orders.declineReason, reviewedAt: orders.reviewedAt, reviewedByEmail: orders.reviewedByEmail,
        reviewEmailSentAt: orders.reviewEmailSentAt, confirmationEmailSentAt: orders.confirmationEmailSentAt,
        createdAt: orders.createdAt,
        customer: { fullName: customers.fullName, email: customers.email, phone: customers.phone },
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.id, id))
      .limit(1)
    if (!order) return reply.code(404).send({ message: "Order not found" })

    // Lines are read from their own snapshot, never from the current catalogue.
    const items = await db
      .select({
        id: orderItems.id, productId: orderItems.productId, variantId: orderItems.variantId,
        sku: orderItems.sku, name: orderItems.productName, dimensions: orderItems.dimensions,
        quantity: orderItems.quantity, unitPriceMinor: orderItems.unitPriceMinor, personalization: orderItems.personalization,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))

    // Each line shows its product's current main image; a missing or unsignable one is left out.
    const productIds = [...new Set(items.map(item => item.productId))]
    const images = productIds.length
      ? await db.select({ productId: mediaAssets.productId, storageKey: mediaAssets.storageKey }).from(mediaAssets)
        .where(and(inArray(mediaAssets.productId, productIds), eq(mediaAssets.isPrimary, true)))
      : []
    const imageByProduct = new Map(await Promise.all(images.map(async image =>
      [image.productId, await imageUrl(image.storageKey).catch(() => null)] as const)))

    return {
      ...order,
      items: items.map(item => ({ ...item, imageUrl: imageByProduct.get(item.productId) ?? null })),
      subtotalMinor: items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),
      amountMinor: items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0) + order.shippingAmountMinor,
    }
  })

  app.put("/orders/:id/decision", async (request, reply) => {
    const { id } = params.parse(request.params)
    const input = decisionInput.parse(request.body)
    const [existing] = await db
      .select({
        id: orders.id, orderNumber: orders.orderNumber, locale: orders.locale,
        status: orders.status, email: customers.email, fullName: customers.fullName,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.id, id))
      .limit(1)
    if (!existing) return reply.code(404).send({ message: "Order not found" })
    if (existing.status !== "submitted") return reply.code(409).send({ message: "Order has already been reviewed" })

    const now = new Date()
    const result = await db.transaction(async tx => {
      const [updated] = await tx.update(orders).set({
        status: input.decision === "accept" ? "confirmed" : "declined",
        paymentStatus: input.decision === "decline" ? "cancelled" : "pending_manual",
        declineReason: input.decision === "decline" ? input.reason : null,
        reviewedAt: now, reviewedBy: request.adminUser?.id, reviewedByEmail: request.adminUser?.email, updatedAt: now,
      }).where(and(eq(orders.id, id), eq(orders.status, "submitted"))).returning()
      if (!updated) return undefined
      const notification = await queueEmail(tx, { kind: "order_decision", orderId: id, payload: {
        to: existing.email, fullName: existing.fullName, orderNumber: existing.orderNumber,
        locale: existing.locale, decision: input.decision,
        reason: input.decision === "decline" ? input.reason : undefined,
      } })
      return { order: updated, notification }
    })
    if (!result) return reply.code(409).send({ message: "Order has already been reviewed" })
    if (result.notification.queued) wakeEmailWorker()
    return result
  })
}
