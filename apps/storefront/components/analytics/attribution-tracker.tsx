"use client"

import { useEffect } from "react"
import { captureAttribution, persistAttribution } from "@/lib/attribution"
import { CONSENT_EVENT } from "@/lib/consent"

/** Notes the campaign or referrer a visitor arrived from (see lib/attribution.ts). */
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution(new URL(window.location.href), document.referrer)
    window.addEventListener(CONSENT_EVENT, persistAttribution)
    return () => window.removeEventListener(CONSENT_EVENT, persistAttribution)
  }, [])
  return null
}
