import { createClient, type User } from "@supabase/supabase-js"
import type { FastifyReply, FastifyRequest } from "fastify"
import { env } from "../env.js"

declare module "fastify" {
  interface FastifyRequest { adminUser: { id: string; email?: string } | null }
}

type AuthClient = { auth: { getUser: (token: string) => Promise<{ data: { user: User | null }; error: { status?: number } | null }> } }
const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const client = env.SUPABASE_URL && key ? createClient(env.SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
}) : null

export function createAdminVerifier(authClient: AuthClient | null, cacheTtlMs = 0) {
  const verified = new Map<string, { expiresAt: number; user: { id: string; email?: string } }>()
  const pending = new Map<string, ReturnType<NonNullable<AuthClient>["auth"]["getUser"]>>()

  return async function verify(request: FastifyRequest, reply: FastifyReply) {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? "")
    if (!match) return reply.code(401).header("WWW-Authenticate", "Bearer").send({ message: "Sign in required" })
    if (!authClient) return reply.code(503).send({ message: "Admin authentication is not configured" })
    const token = match[1]
    const cached = verified.get(token)
    if (cached && cached.expiresAt > Date.now()) {
      request.adminUser = cached.user
      return
    }
    if (cached) verified.delete(token)
    let result
    try {
      let verification = pending.get(token)
      if (!verification) {
        verification = authClient.auth.getUser(token)
        pending.set(token, verification)
      }
      result = await verification
    } catch {
      return reply.code(503).send({ message: "Authentication service unavailable" })
    } finally {
      pending.delete(token)
    }
    if (result.error && (!result.error.status || result.error.status >= 500 || result.error.status === 429)) {
      return reply.code(503).send({ message: "Authentication service unavailable" })
    }
    if (result.error || !result.data.user) return reply.code(401).header("WWW-Authenticate", "Bearer").send({ message: "Invalid or expired session" })
    const user = result.data.user
    // Only server-managed metadata can grant admin privileges.
    if (user.app_metadata?.role !== "admin" || !user.email_confirmed_at || user.is_anonymous) {
      return reply.code(403).send({ message: "Admin access required" })
    }
    request.adminUser = { id: user.id, email: user.email }
    if (cacheTtlMs > 0) {
      if (verified.size >= 100) {
        for (const [key, value] of verified) if (value.expiresAt <= Date.now()) verified.delete(key)
      }
      verified.set(token, { expiresAt: Date.now() + cacheTtlMs, user: request.adminUser })
    }
  }
}

export const verifyAdminSession = createAdminVerifier(client, 60_000)
