import Image from "next/image"
import logo from "@/public/logo.png"
import logoLight from "@/public/logo-light.png"
import { cn } from "@/lib/utils"

/**
 * The LNA Sehara logo. `tone="light"` is the version for dark backgrounds (cream script,
 * pink letters). Pass `alt` only where the logo isn't already inside a labelled link.
 */
export function Wordmark({ className, size = "md", tone = "dark", alt = "", priority = false }: {
  className?: string
  size?: "md" | "lg"
  tone?: "dark" | "light"
  alt?: string
  priority?: boolean
}) {
  return (
    <Image
      src={tone === "light" ? logoLight : logo}
      alt={alt}
      priority={priority}
      sizes={size === "lg" ? "220px" : "110px"}
      className={cn("w-auto", size === "lg" ? "h-28 md:h-32" : "h-14 md:h-16", className)}
    />
  )
}
