"use client"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import type { Locale } from "@/lib/products"

export function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
    </>
  )
}
