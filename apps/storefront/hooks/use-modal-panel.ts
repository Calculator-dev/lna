"use client"

import { useEffect, useRef } from "react"

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog behaviour for slide-over panels: moves focus in when opened, keeps Tab inside,
 * closes on Escape, locks page scroll, and returns focus to the opener when closed.
 */
export function useModalPanel<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const panel = useRef<T | null>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    if (!open || !panel.current) return
    const element = panel.current
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    element.querySelector<HTMLElement>(focusable)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close.current()
        return
      }
      if (event.key !== "Tab") return
      const items = Array.from(element.querySelectorAll<HTMLElement>(focusable))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      opener?.focus()
    }
  }, [open])

  return panel
}
