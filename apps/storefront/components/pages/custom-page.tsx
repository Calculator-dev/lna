import Image from "next/image"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { CustomForm } from "@/components/custom-form"
import { PageIntro } from "@/components/page-intro"
import { Reveal } from "@/components/reveal"
import { type Locale } from "@/lib/products"

const bullets = ["signage", "gifts", "batch"] as const

export function CustomPage({ locale }: { locale: Locale }) {
  const t = useTranslations("custom")

  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mx-auto grid max-w-375 items-start gap-5 px-4 pb-16 md:px-6 md:pb-24 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-4xl bg-primary text-primary-foreground">
            <div className="relative h-56 md:h-64">
              <Image src="/images/product-name-sign.jpg" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-primary to-transparent" />
            </div>
            <div className="space-y-6 p-6 pt-2 md:p-9 md:pt-2">
              <p className="font-serif text-4xl leading-tight">{t("helpTitle")}</p>
              <ul className="space-y-3">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-sm leading-6 text-primary-foreground/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-honey text-walnut"><Check className="h-3 w-3" strokeWidth={3} /></span>
                    {t(`bullets.${bullet}`)}
                  </li>
                ))}
              </ul>
              <p className="rounded-2xl bg-primary-foreground/10 p-4 text-sm leading-6 text-primary-foreground/80">{t("helpNote")}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <CustomForm locale={locale} />
        </Reveal>
      </div>
    </>
  )
}
