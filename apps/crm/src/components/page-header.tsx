import type { ReactNode } from "react"

/** Page title; the layout moves focus here after navigation (see focusPageTitle). */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h1 id="page-title" tabIndex={-1} className="mt-2 font-serif text-4xl outline-none">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </header>
  )
}
