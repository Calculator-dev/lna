import { ZodError } from "zod"
import { pool } from "./db/client.js"
import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import { corsOrigins, trustProxy } from "./env.js"
import sensible from "@fastify/sensible"
import Fastify from "fastify"
import { publicRoutes } from "./routes/public.js"
import { adminRoutes } from "./routes/admin.js"

export function createApp() {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.cookie"] }, trustProxy })

  app.addHook("onClose", async () => { if (!pool.ended) await pool.end() })
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: "Invalid request", fields: error.issues.map((issue) => issue.path.join(".")) })
    }
    const failure = error as { statusCode?: number; code?: string; message?: string }
    const status = failure.statusCode ?? 500
    if (status >= 500) request.log.error({ code: failure.code }, "Request failed")
    return reply.code(status).send({ message: status >= 500 ? "Internal server error" : failure.message })
  })

  // Admin requests use bearer tokens, not cookies, so credentials are never needed.
  app.register(cors, { origin: corsOrigins })
  // Opt-in per route (see the public form endpoints).
  app.register(rateLimit, { global: false })
  app.register(sensible)

  app.get("/health", async () => ({ ok: true }))
  app.register(publicRoutes, { prefix: "/public" })
  app.register(adminRoutes, { prefix: "/admin" })

  return app
}
