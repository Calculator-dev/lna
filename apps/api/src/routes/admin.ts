import { catalogueRoutes } from "./catalogue.js"
import type { FastifyPluginAsync } from "fastify"
import { mediaRoutes } from "./media.js"
import { verifyAdminSession } from "../plugins/admin-auth.js"
import { dashboardRoutes } from "./dashboard.js"
import { orderReviewRoutes } from "./order-review.js"
import { adminInquiryRoutes } from "./inquiries.js"

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.decorateRequest("adminUser", null)
  app.addHook("preHandler", verifyAdminSession)

  app.get("/me", async (request) => ({ user: request.adminUser }))

  app.register(dashboardRoutes)

  app.register(catalogueRoutes)

  app.register(orderReviewRoutes)

  app.register(mediaRoutes)

  app.register(adminInquiryRoutes)
}
