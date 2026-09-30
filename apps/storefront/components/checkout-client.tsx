"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { useCart } from "@/components/cart-provider"
import { formatPrice, OrderError, submitOrder, type Locale, isSvg } from "@/lib/products"

export function CheckoutClient({ locale }: { locale: Locale }) {
  const router = useRouter()
  const { items, subtotal, shippingAmount: shipping, clear } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const t = useTranslations("checkout")
  const cart = useTranslations("cart")

  const total = subtotal + shipping

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (items.length === 0) return

    const formData = new FormData(event.currentTarget)
    setSubmitting(true)

    try {
      const response = await submitOrder({
        locale,
        customer: {
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
        },
        shipping: {
          address: String(formData.get("address") ?? ""),
          city: String(formData.get("city") ?? ""),
          postalCode: String(formData.get("postalCode") ?? ""),
          country: String(formData.get("country") ?? ""),
        },
        notes: String(formData.get("notes") ?? ""),
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          personalization: item.personalization,
        })),
      })

      clear()
      const successBase = locale === "en" ? "/en/checkout/success" : "/checkout/success"
      router.push(`${successBase}?order=${encodeURIComponent(response.orderNumber)}`)
    } catch (error) {
      // Validation messages from the API are English; show them as detail after the localized summary.
      const detail = error instanceof OrderError && error.message !== "Order submission failed" ? ` (${error.message})` : ""
      toast.error(t("submitError") + detail)
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto mb-20 max-w-3xl rounded-4xl bg-secondary p-10 text-center">
        <h2 className="font-serif text-4xl">{cart("emptyTitle")}</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <Link
          href={locale === "en" ? "/en/shop" : "/shop"}
          className="btn-primary mt-8"
        >
          {t("backToShop")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-375 items-start gap-8 px-4 pb-16 md:grid-cols-[1.15fr_0.85fr] md:px-6 md:pb-24 lg:gap-12">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title={t("sections.contact")}>
          <Input id="fullName" label={t("fields.fullName")} required />
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="email" label="Email" type="email" required />
            <Input id="phone" label={t("fields.phone")} />
          </div>
        </Section>

        <Section title={t("sections.shipping")}>
          <Input id="address" label={t("fields.address")} required />
          <div className="grid gap-4 md:grid-cols-3">
            <Input id="city" label={t("fields.city")} required />
            <Input id="postalCode" label={t("fields.postalCode")} />
            <Input id="country" label={t("fields.country")} required defaultValue={t("fields.countryDefault")} />
          </div>
        </Section>

        <Section title={t("sections.notes")}>
          <label htmlFor="notes" className="field-label">
            {t("fields.notes")}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="field resize-none"
            placeholder={t("fields.notesPlaceholder")}
          />
        </Section>

        <div className="rounded-2xl bg-resin-soft p-5 text-sm leading-7 text-primary">
          {t("confirmationNote")}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? t("submitting") : t("submit", { total: formatPrice(total, locale) })}
        </button>
      </form>

      <aside className="h-fit rounded-4xl bg-walnut p-6 text-linen md:sticky md:top-28 md:p-8">
        <p className="font-serif text-3xl">{t("summary.title")}</p>
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.lineId} className="flex gap-3">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-linen/10">
                <Image unoptimized={isSvg(item.image)} src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-linen/60">
                  {t("summary.quantity", { quantity: item.quantity })}
                </p>
                {item.dimensions && <p className="mt-1 text-xs text-linen/60">{cart("dimensions", { dimensions: item.dimensions })}</p>}
                {item.variantSku && <p className="mt-1 text-xs text-linen/60">SKU: {item.variantSku}</p>}
                {item.personalization && <p className="mt-1 text-xs text-linen/60">{item.personalization}</p>}
              </div>
              <p className="text-sm">{formatPrice(item.price * item.quantity, locale)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-3 border-t border-linen/15 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-linen/60">{t("summary.products")}</dt>
            <dd>{formatPrice(subtotal, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-linen/60">{t("sections.shipping")}</dt>
            <dd>{shipping === 0 ? t("summary.free") : formatPrice(shipping, locale)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-linen/15 pt-3">
            <dt>{t("summary.total")}</dt>
            <dd className="font-serif text-4xl text-honey">{formatPrice(total, locale)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 md:p-7">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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
