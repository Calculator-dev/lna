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
    <form onSubmit={handleSubmit} className="grid gap-4 border border-border/60 bg-secondary/30 p-6">
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
        <label htmlFor="brief" className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {t("brief")}
        </label>
        <textarea
          id="brief"
          name="brief"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          placeholder={t("briefPlaceholder")}
        />
      </div>
      <button type="submit" disabled={sending} className="mt-2 flex h-12 items-center justify-center bg-foreground text-sm tracking-wide text-background disabled:opacity-60">
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
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...props}
        className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
      />
    </div>
  )
}
