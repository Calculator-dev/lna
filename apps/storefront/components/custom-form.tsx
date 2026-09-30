"use client"

import type React from "react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { submitInquiry, type Locale } from "@/lib/products"

export function CustomForm({ locale }: { locale: Locale }) {
  const t = useTranslations("custom.form")
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // currentTarget is cleared once the handler awaits, so keep the form element.
    const form = event.currentTarget
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? "").trim()
    setSending(true)
    try {
      await submitInquiry({
        locale,
        fullName: text("fullName"),
        email: text("email"),
        phone: text("phone"),
        brief: text("brief"),
        dimensions: text("dimensions"),
        deadline: text("deadline"),
      })
      toast.success(t("success"))
      form.reset()
    } catch {
      toast.error(t("error"))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-4xl border border-border bg-card p-6 shadow-[0_24px_60px_-40px_rgba(43,29,20,0.45)] md:p-9">
      <span className="ornament block w-24 text-accent" aria-hidden />
      <div className="grid gap-4 md:grid-cols-2">
        <Input id="fullName" label={t("fullName")} required minLength={2} maxLength={160} />
        <Input id="email" label={t("email")} type="email" required maxLength={190} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input id="phone" label={t("phone")} type="tel" maxLength={60} />
        <Input id="deadline" label={t("deadline")} maxLength={120} />
      </div>
      <Input id="dimensions" label={t("dimensions")} maxLength={300} />
      <div>
        <label htmlFor="brief" className="field-label">
          {t("brief")}
        </label>
        <textarea
          id="brief"
          name="brief"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          className="field resize-none"
          placeholder={t("briefPlaceholder")}
        />
      </div>
      <button type="submit" disabled={sending} className="btn-primary mt-2 w-full">
        {sending ? t("sending") : t("submit")}
      </button>
    </form>
  )
}

function Input({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...props}
        className="field"
      />
    </div>
  )
}
