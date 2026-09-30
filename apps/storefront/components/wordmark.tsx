import { cn } from "@/lib/utils"

/** "LNA" set large in the display serif, with "kreativna sehara" stacked beside it. */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-current", className)}>
      <span className={cn("font-serif italic leading-none", size === "lg" ? "text-6xl md:text-7xl" : "text-[34px]")}>LNA</span>
      <span className={cn("border-l border-current/30 pl-2.5 font-semibold uppercase leading-[1.15]", size === "lg" ? "text-xs tracking-[0.3em]" : "text-[9.5px] tracking-[0.26em]")}>
        kreativna
        <br />
        sehara
      </span>
    </span>
  )
}
