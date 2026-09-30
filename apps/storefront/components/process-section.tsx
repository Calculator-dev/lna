import { useTranslations } from "next-intl"
import { Reveal } from "@/components/reveal"

const steps = ["define", "prepare", "finish"] as const

export function ProcessSection() {
  const t = useTranslations("process")

  return (
    <section className="px-2 pb-16 md:px-4 md:pb-24">
      <div className="mx-auto max-w-400 rounded-4xl bg-walnut px-6 py-16 text-linen md:rounded-[2.75rem] md:px-12 md:py-20 lg:px-16">
        <Reveal>
          <p className="eyebrow text-honey">{t("eyebrow")}</p>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="mt-5 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end md:gap-12">
            <h2 className="font-serif text-5xl leading-[0.98] md:text-6xl">{t("title")}</h2>
            <p className="text-base leading-7 text-linen/70">{t("description")}</p>
          </div>
        </Reveal>

        <div className="relative mt-14">
          <span className="ornament absolute inset-x-0 top-5 hidden text-linen/15 md:block" aria-hidden />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step} className="relative">
              <Reveal delay={0.08 * index}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-honey font-serif text-3xl text-walnut">{index + 1}</span>
                <p className="mt-6 max-w-xs text-base leading-7 text-linen/85">{t(`steps.${step}`)}</p>
              </Reveal>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
