import { CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Reveal } from "@/components/reveal"

const steps = ["define", "prepare", "finish"] as const

export function ProcessSection() {
  const t = useTranslations("process")

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{t("eyebrow")}</p>
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-4 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <h2 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">{t("title")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("description")}</p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step} delay={0.08 * index}>
            <div className="border border-border/60 p-6">
              <CheckCircle2 className="h-5 w-5 text-accent" strokeWidth={1.8} />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{t(`steps.${step}`)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
