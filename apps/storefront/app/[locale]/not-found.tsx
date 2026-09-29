import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import { buildPath } from "@/lib/products"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations("notFound")
  const common = await getTranslations("common")
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">404</p>
      <h1 className="mt-4 font-serif text-5xl">{t("title")}</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("description")}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href={buildPath(locale)} className="inline-flex h-12 items-center justify-center bg-foreground px-6 text-sm tracking-wide text-background">
          {common("home")}
        </Link>
        <Link href={buildPath(locale, "/shop")} className="inline-flex h-12 items-center justify-center border border-border px-6 text-sm tracking-wide">
          {common("shop")}
        </Link>
      </div>
    </div>
  )
}
