"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { CONSENT_EVENT, readConsent, type ConsentChoice } from "@/lib/consent"
import { loadMetaPixel, metaPixelId, metaTrack, revokeMetaPixel } from "@/lib/meta-pixel"

/** Loads the Meta Pixel after cookie consent and records client-side page changes. */
export function MetaPixel() {
  const pathname = usePathname()
  const firstPath = useRef(true)

  useEffect(() => {
    if (!metaPixelId) return
    if (readConsent() === "granted") loadMetaPixel()
    const onChange = (event: Event) => {
      if ((event as CustomEvent<ConsentChoice>).detail === "granted") loadMetaPixel()
      else revokeMetaPixel()
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  useEffect(() => {
    // The first page view is sent when the pixel loads.
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    metaTrack("PageView")
  }, [pathname])

  return null
}
