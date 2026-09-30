import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import { buildPath } from "@/lib/products"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations("notFound")
  const common = await getTranslations("common")
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
      <p className="font-serif text-[140px] italic leading-none text-accent">404</p>
      <span className="ornament mx-auto mt-4 block w-24 text-accent" aria-hidden />
      <h1 className="mt-6 font-serif text-5xl">{t("title")}</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("description")}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href={buildPath(locale)} className="btn-primary">
          {common("home")}
        </Link>
        <Link href={buildPath(locale, "/shop")} className="btn-outline">
          {common("shop")}
        </Link>
      </div>
    </div>
  )
}
