import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Wordmark } from "@/components/wordmark"
import { buildPath, type Locale } from "@/lib/products"

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = useTranslations("footer")
  const common = useTranslations("common")
  const prefix = locale === "en" ? "/en" : ""

  return (
    <footer className="relative overflow-hidden bg-walnut text-linen">
      <span className="ornament block text-honey/70" aria-hidden />
      <div className="mx-auto grid max-w-375 gap-12 px-4 py-16 md:grid-cols-12 md:px-6 md:py-20">
        <div className="md:col-span-6">
          <Wordmark size="lg" className="text-linen" />
          <p className="mt-6 max-w-lg text-sm leading-7 text-linen/65">
            {t("description")}
          </p>
          <Link href={`${prefix}/custom`} className="btn mt-8 bg-honey text-walnut hover:bg-honey/85">
            {t("customWork")} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow text-honey">{t("navigation")}</p>
          <div className="mt-5 flex flex-col gap-3 font-serif text-2xl">
            <Link href={`${prefix}/shop`} className="w-fit hover:text-honey">{common("shop")}</Link>
            <Link href={`${prefix}/custom`} className="w-fit hover:text-honey">{t("customWork")}</Link>
            <Link href={`${prefix}/about`} className="w-fit hover:text-honey">{t("about")}</Link>
          </div>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow text-honey">{t("contact")}</p>
          <div className="mt-5 space-y-3 text-sm text-linen/75">
            <a href="mailto:info@lnakreativnasehara.ba" className="block w-fit hover:text-honey">info@lnakreativnasehara.ba</a>
            <a href="tel:+38761000000" className="block w-fit hover:text-honey">+387 61 000 000</a>
            <p>{t("location")}</p>
          </div>
        </div>
      </div>

      <p className="pointer-events-none select-none px-4 text-center font-serif text-[23vw] italic leading-[0.72] text-linen/6 md:text-[19vw]" aria-hidden>
        sehara
      </p>

      <div className="border-t border-linen/12">
        <div className="mx-auto flex max-w-375 flex-col gap-3 px-4 py-5 text-xs text-linen/50 md:flex-row md:items-center md:justify-between md:px-6">
          <p>{t("languageNote")}</p>
          <Link href={buildPath(locale)} className="hover:text-honey">{t("backHome")}</Link>
        </div>
      </div>
    </footer>
  )
}
