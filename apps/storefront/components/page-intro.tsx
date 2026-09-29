import { Reveal } from "@/components/reveal"

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:px-6 md:pb-14 md:pt-14">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-4 grid gap-6 md:grid-cols-[1.15fr_1fr]">
          <h1 className="font-serif text-5xl leading-[0.98] text-foreground">{title}</h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
      </Reveal>
    </div>
  )
}
