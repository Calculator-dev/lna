import { ZodError } from "zod"
import { pool } from "./db/client.js"
import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import { corsOrigins, trustProxy } from "./env.js"
import sensible from "@fastify/sensible"
import Fastify from "fastify"
import { publicRoutes } from "./routes/public.js"
import { adminRoutes } from "./routes/admin.js"
import { NEXT_CURSOR_HEADER } from "./lib/pagination.js"

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
  // The CRM reads the next page's cursor of admin lists from a response header.
  app.register(cors, { origin: corsOrigins, exposedHeaders: [NEXT_CURSOR_HEADER] })
  // Opt-in per route (see the public form endpoints).
  app.register(rateLimit, { global: false })
  app.register(sensible)

  // The API only serves JSON (and image redirects), so nothing it returns may be framed,
  // sniffed as another type, or run scripts.
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff")
    reply.header("X-Frame-Options", "DENY")
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin")
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
  })

  // Render checks this every few seconds; logging each check would bury the real requests.
  app.get("/health", { logLevel: "silent" }, async () => ({ ok: true }))
  app.register(publicRoutes, { prefix: "/public" })
  app.register(adminRoutes, { prefix: "/admin" })

  return app
}
