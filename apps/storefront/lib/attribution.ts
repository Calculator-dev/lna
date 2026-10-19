// Where a visitor came from (campaign tags, ad click IDs or a referring site), sent with their
// order or inquiry so the CRM shows which campaign brought it, independent of ad blockers.
// It lives in memory and is only saved in the browser once the visitor accepts cookies.

import { readConsent } from "@/lib/consent"

export type Attribution = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  gclid?: string
  fbclid?: string
  referrer?: string
  landingPath?: string
  capturedAt: string
}

const KEY = "lna-attribution-v1"
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const params = { utm_source: "source", utm_medium: "medium", utm_campaign: "campaign", utm_term: "term", utm_content: "content", gclid: "gclid", fbclid: "fbclid" } as const
const clip = (value: string) => value.slice(0, 300)

let current: Attribution | null = null

function stored(): Attribution | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Attribution | null
    return value && Date.now() - Date.parse(value.capturedAt) < MAX_AGE_MS ? value : null
  } catch {
    return null
  }
}

/**
 * Records this page load's source: a campaign link always wins (last campaign touch); an
 * outside referrer only counts when nothing is known yet; direct visits keep what was there.
 */
export function captureAttribution(location: URL, referrer: string) {
  const fromUrl: Partial<Attribution> = {}
  for (const [param, field] of Object.entries(params)) {
    const value = location.searchParams.get(param)
    if (value) fromUrl[field] = clip(value)
  }
  const external = referrer && (() => { try { return new URL(referrer).host !== location.host } catch { return false } })()
  const known = current ?? stored()
  if (Object.keys(fromUrl).length) current = { ...fromUrl, referrer: external ? clip(referrer) : undefined, landingPath: clip(location.pathname), capturedAt: new Date().toISOString() }
  else if (!known && external) current = { source: clip(new URL(referrer).hostname), medium: "referral", referrer: clip(referrer), landingPath: clip(location.pathname), capturedAt: new Date().toISOString() }
  else current = known
  if (readConsent() === "granted") persistAttribution()
}

/** Saves the known source once the visitor accepts cookies, or forgets it if they decline. */
export function persistAttribution() {
  try {
    if (readConsent() === "granted" && current) window.localStorage.setItem(KEY, JSON.stringify(current))
    else if (readConsent() === "denied") window.localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the source still goes with an order placed during this visit.
  }
}

export function currentAttribution(): Attribution | undefined {
  return current ?? stored() ?? undefined
}
