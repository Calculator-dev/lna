// Meta (Facebook/Instagram) Pixel for measuring and optimising Meta ads. Unlike GTM it is only
// loaded once the visitor accepts cookies, so nothing reaches Meta before that. Shop events are
// mirrored from lib/analytics.ts as Meta's standard events. Nothing loads without an ID.

import { readConsent } from "@/lib/consent"

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown }
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

const configuredId = process.env.NEXT_PUBLIC_META_PIXEL_ID
export const metaPixelId = configuredId && /^\d{6,20}$/.test(configuredId) ? configuredId : undefined

/** Defines fbq, loads Meta's script and records the first page view. Safe to call more than once. */
export function loadMetaPixel() {
  if (!metaPixelId || typeof window === "undefined") return
  if (window.fbq) {
    window.fbq("consent", "grant")
    return
  }
  // Meta's standard snippet: fbq queues calls until fbevents.js has loaded.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  window.fbq = fbq
  window._fbq ??= fbq
  const script = document.createElement("script")
  script.async = true
  script.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(script)
  fbq("init", metaPixelId)
  fbq("track", "PageView")
}

/** Stops sending for the rest of the visit after the visitor withdraws consent. */
export function revokeMetaPixel() {
  window.fbq?.("consent", "revoke")
}

/** Sends a standard event if the visitor accepted cookies; does nothing otherwise. */
export function metaTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!metaPixelId || typeof window === "undefined") return
  // A page's own events can run before <MetaPixel> has loaded the pixel.
  if (!window.fbq && readConsent() === "granted") loadMetaPixel()
  if (!window.fbq) return
  if (eventId) window.fbq("track", event, params, { eventID: eventId })
  else window.fbq("track", event, params)
}
