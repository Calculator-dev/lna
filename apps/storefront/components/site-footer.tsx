import Link from "next/link"
import { useTranslations } from "next-intl"
import { buildPath, siteName, type Locale } from "@/lib/products"

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = useTranslations("footer")
  const common = useTranslations("common")
  const prefix = locale === "en" ? "/en" : ""

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-375 gap-10 px-4 py-16 md:grid-cols-4 md:px-6 md:py-20">
        <div className="md:col-span-2">
          <p className="text-2xl font-black uppercase tracking-[-0.04em]">{siteName}</p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
            {t("description")}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t("navigation")}</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <Link href={`${prefix}/shop`}>{common("shop")}</Link>
            <Link href={`${prefix}/custom`}>{t("customWork")}</Link>
            <Link href={`${prefix}/about`}>{t("about")}</Link>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t("contact")}</p>
          <div className="mt-4 space-y-3 text-sm text-white/60">
            <p>info@lnakreativnasehara.ba</p>
            <p>+387 61 000 000</p>
            <p>{t("location")}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-375 flex-col gap-3 px-4 py-5 text-xs text-white/45 md:flex-row md:items-center md:justify-between md:px-6">
          <p>{t("languageNote")}</p>
          <Link href={buildPath(locale)}>{t("backHome")}</Link>
        </div>
      </div>
    </footer>
  )
}
