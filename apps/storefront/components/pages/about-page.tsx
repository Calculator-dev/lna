import { useTranslations } from "next-intl"
import { PageIntro } from "@/components/page-intro"
import { ProcessSection } from "@/components/process-section"
import { Reveal } from "@/components/reveal"

const values = ["precision", "flexibility", "speed"] as const

export function AboutPage() {
  const t = useTranslations("about")

  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 md:grid-cols-3 md:px-6 md:pb-24">
        {values.map((value, index) => (
          <Reveal key={value} delay={0.06 * index}>
            <div className="border border-border/60 p-6">
              <p className="font-serif text-2xl">{t(`values.${value}.title`)}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{t(`values.${value}.text`)}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <ProcessSection />
    </>
  )
}
