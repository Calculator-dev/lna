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

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:pb-24">
        <Reveal>
          <div className="space-y-5 border border-border/60 p-6">
            <p className="font-serif text-3xl">{t("helpTitle")}</p>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              {bullets.map((bullet) => (
                <li key={bullet}>• {t(`bullets.${bullet}`)}</li>
              ))}
            </ul>
            <p className="text-sm leading-7 text-muted-foreground">{t("helpNote")}</p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <CustomForm locale={locale} />
        </Reveal>
      </div>
    </>
  )
}
