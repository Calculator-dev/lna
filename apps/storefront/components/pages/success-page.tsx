import Link from "next/link"
import { useTranslations } from "next-intl"
import { type Locale } from "@/lib/products"

const orderNumberPattern = /^LNA-\d{6}-[A-F0-9]{8}$/

export function SuccessPage({ locale, orderNumber }: { locale: Locale; orderNumber?: string }) {
  const href = locale === "en" ? "/en/shop" : "/shop"
  const t = useTranslations("success")

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
      <div className="border border-border/60 bg-secondary/30 p-10 md:p-14">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {t("description")}
        </p>
        {orderNumber && orderNumberPattern.test(orderNumber) && <p className="mt-6 font-medium text-foreground">{orderNumber}</p>}
        <Link href={href} className="mt-8 inline-flex h-12 items-center justify-center bg-foreground px-6 text-sm tracking-wide text-background">
          {t("backToShop")}
        </Link>
      </div>
    </div>
  )
}
