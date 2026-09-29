import type { InputHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  )
}
