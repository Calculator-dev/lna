import { useTranslations } from "next-intl"
import { PageIntro } from "@/components/page-intro"

export function PrivacyPage() {
  const t = useTranslations("privacy")
  const sections = t.raw("sections") as Array<{ title: string; body: string }>
  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 md:px-6 md:pb-28">
        {sections.map(section => (
          <section key={section.title}>
            <h2 className="font-serif text-3xl">{section.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </>
  )
}
