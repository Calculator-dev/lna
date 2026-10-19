"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { gtmId } from "@/lib/analytics"
import { readConsent, saveConsent, type ConsentChoice } from "@/lib/consent"
import { buildPath, type Locale } from "@/lib/products"

export const OPEN_CONSENT_EVENT = "lna-open-consent"

/** Asks once for analytics and ad cookies; the footer's "Cookie settings" reopens it. */
export function ConsentBanner({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("consent")

  useEffect(() => {
    if (!gtmId) return
    if (!readConsent()) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  if (!open) return null
  const choose = (choice: ConsentChoice) => {
    saveConsent(choice)
    setOpen(false)
  }
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-3xl border border-border bg-card p-5 shadow-xl md:p-6">
      <p id="consent-title" className="font-serif text-2xl">{t("title")}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {t("text")} <Link href={buildPath(locale, "/privacy")} className="underline underline-offset-4">{t("privacy")}</Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => choose("granted")}>{t("accept")}</button>
        <button type="button" className="btn-outline" onClick={() => choose("denied")}>{t("decline")}</button>
      </div>
    </div>
  )
}

/** Footer link that reopens the banner. Hidden when analytics isn't configured. */
export function ConsentSettingsLink({ className }: { className?: string }) {
  const t = useTranslations("consent")
  if (!gtmId) return null
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>{t("settings")}</button>
}
