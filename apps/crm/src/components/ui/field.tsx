import type { ReactNode } from "react"

export const control =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-5 text-muted-foreground">{hint}</span>}
    </label>
  )
}
