"use client"

import type { PropsWithChildren } from "react"
import { useLayoutEffect, useRef } from "react"

type RevealProps = PropsWithChildren<{
  className?: string
  y?: number
  delay?: number
}>

/**
 * Fades content in as it scrolls into view. Content already on screen at load is never
 * hidden, so above-the-fold text doesn't flash, and nothing is hidden without JavaScript.
 */
export function Reveal({ children, className, y = 28, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const target = ref.current
    if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (target.getBoundingClientRect().top < window.innerHeight * 0.88) return

    target.style.opacity = "0"
    target.style.transform = `translateY(${y}px)`
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      target.style.transition = `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`
      target.style.opacity = ""
      target.style.transform = ""
    }, { rootMargin: "0px 0px -12% 0px" })
    observer.observe(target)

    return () => {
      observer.disconnect()
      target.style.opacity = ""
      target.style.transform = ""
      target.style.transition = ""
    }
  }, [delay, y])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
