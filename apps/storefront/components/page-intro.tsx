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
    <div className="mx-auto max-w-375 px-4 pb-12 pt-12 md:px-6 md:pb-16 md:pt-16">
      <Reveal>
        <p className="eyebrow flex items-center gap-3 text-primary">
          <span className="ornament block w-12 text-accent" aria-hidden />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-6 grid items-end gap-6 md:grid-cols-[1.4fr_1fr] md:gap-12">
          <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] text-foreground md:text-7xl">{title}</h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground md:border-l md:border-border md:pl-8">{description}</p>
        </div>
      </Reveal>
    </div>
  )
}
