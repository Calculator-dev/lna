"use client"

import { useTranslations } from "next-intl"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error")
  return (
    <div role="alert" className="mx-auto max-w-3xl px-6 py-24 text-center">
      <span className="ornament mx-auto block w-24 text-accent" aria-hidden />
      <h1 className="mt-6 font-serif text-5xl">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("description")}</p>
      <button onClick={reset} className="btn-primary mt-8">{t("retry")}</button>
    </div>
  )
}
