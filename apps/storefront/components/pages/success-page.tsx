import Link from "next/link"
import { useTranslations } from "next-intl"
import { type Locale } from "@/lib/products"

const orderNumberPattern = /^LNA-\d{6}-[A-F0-9]{8}$/

export function SuccessPage({ locale, orderNumber }: { locale: Locale; orderNumber?: string }) {
  const href = locale === "en" ? "/en/shop" : "/shop"
  const t = useTranslations("success")

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
      <div className="rounded-4xl bg-primary p-10 text-primary-foreground md:p-14">
        <span className="ornament mx-auto block w-28 text-honey" aria-hidden />
        <p className="eyebrow mt-6 text-honey">{t("eyebrow")}</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 text-sm leading-7 text-primary-foreground/75">
          {t("description")}
        </p>
        {orderNumber && orderNumberPattern.test(orderNumber) && <p className="mx-auto mt-6 w-fit rounded-full bg-primary-foreground/10 px-5 py-2 font-mono text-sm">{orderNumber}</p>}
        <Link href={href} className="btn mt-8 bg-honey text-accent-foreground hover:bg-honey/85">
          {t("backToShop")}
        </Link>
      </div>
    </div>
  )
}
