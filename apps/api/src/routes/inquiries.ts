import type { FastifyPluginAsync } from "fastify"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client.js"
import { inquiries } from "../db/schema.js"
import { sendInquiryNotification } from "../services/order-email.js"
import { publicFormRateLimit } from "../lib/rate-limits.js"

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined)

// Limits mirror the inquiries column sizes.
export const inquiryInput = z.object({
  locale: z.enum(["bs", "en"]).default("bs"),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(190),
  phone: optionalText(60),
  brief: z.string().trim().min(10).max(5000),
  dimensions: optionalText(300),
  deadline: optionalText(120),
})

export const publicInquiryRoutes: FastifyPluginAsync = async app => {
  app.post("/inquiries", { config: { rateLimit: publicFormRateLimit } }, async (request, reply) => {
    const input = inquiryInput.parse(request.body)
    const [inquiry] = await db.insert(inquiries).values(input).returning({ id: inquiries.id, createdAt: inquiries.createdAt })
    const notification = await sendInquiryNotification(input)
    if (!notification.sent && notification.reason === "delivery_failed") request.log.warn({ inquiryId: inquiry.id }, "Inquiry notification email failed")
    return reply.code(201).send({ ok: true, id: inquiry.id })
  })
}

// Registered inside the authenticated admin route scope.
export const adminInquiryRoutes: FastifyPluginAsync = async app => {
  app.get("/inquiries", async () => db
    .select({ id: inquiries.id, fullName: inquiries.fullName, email: inquiries.email, brief: inquiries.brief, deadline: inquiries.deadline, createdAt: inquiries.createdAt })
    .from(inquiries)
    .orderBy(desc(inquiries.createdAt)))

  app.get("/inquiries/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1)
    if (!inquiry) return reply.code(404).send({ message: "Inquiry not found" })
    return inquiry
  })
}
