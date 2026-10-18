import type { FastifyBaseLogger } from "fastify"
import { env } from "../env.js"

/**
 * Tells the storefront to drop its cached catalogue so CRM changes show up on the next page
 * view. Without this the storefront still refreshes on its own within a few minutes, so a
 * failure is logged and never fails the save.
 */
export async function revalidateStorefrontCatalogue(log: FastifyBaseLogger) {
  if (!env.STOREFRONT_REVALIDATE_URL || !env.REVALIDATE_SECRET) return
  try {
    const response = await fetch(env.STOREFRONT_REVALIDATE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.REVALIDATE_SECRET}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) log.warn({ status: response.status }, "Storefront catalogue revalidation was rejected")
  } catch {
    log.warn("Storefront catalogue revalidation failed")
  }
}
