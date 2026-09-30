import Image from "next/image"
import { useTranslations } from "next-intl"
import { PageIntro } from "@/components/page-intro"
import { ProcessSection } from "@/components/process-section"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"

const values = [
  { key: "precision", surface: "bg-honey-soft" },
  { key: "flexibility", surface: "bg-resin-soft" },
  { key: "speed", surface: "bg-clay" },
] as const

export function AboutPage() {
  const t = useTranslations("about")

  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mx-auto grid max-w-375 gap-4 px-4 pb-16 md:grid-cols-[1.1fr_1fr] md:gap-5 md:px-6 md:pb-24">
        <Reveal className="h-full">
          <div className="arch relative h-full min-h-105 overflow-hidden bg-secondary">
            <Image src="/images/hero-lifestyle.jpg" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
        <div className="grid gap-4 md:gap-5">
          {values.map((value, index) => (
            <Reveal key={value.key} delay={0.06 * index}>
              <div className={cn("flex h-full gap-6 rounded-3xl p-6 md:p-8", value.surface)}>
                <span className="font-serif text-5xl leading-none text-foreground/35">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-serif text-3xl leading-tight">{t(`values.${value.key}.title`)}</p>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{t(`values.${value.key}.text`)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <ProcessSection />
    </>
  )
}
