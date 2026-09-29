import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { getInquiry } from "../lib/api"
import { formatDateTime } from "../lib/format"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

const date = formatDateTime

export function InquiryDetails({ id, onBack }: { id: string; onBack: () => void }) {
  const query = useQuery({ queryKey: ["inquiry", id], queryFn: () => getInquiry(id) })
  if (query.isPending) return <p role="status" className="mt-6">Učitavanje upita…</p>
  if (!query.data) return <div className="mt-6 space-y-4"><p role="alert" className="text-destructive">{query.error?.message ?? "Upit nije moguće učitati."}</p><Button variant="outline" onClick={onBack}>Nazad na upite</Button></div>
  const inquiry = query.data

  return (
    <div className="space-y-6 pt-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Nazad na upite
      </button>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Upit za izradu po mjeri</p>
        <h1 id="page-title" tabIndex={-1} className="mt-2 font-serif text-4xl outline-none">{inquiry.fullName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Primljen {date(inquiry.createdAt)} · {inquiry.locale === "en" ? "engleski" : "bosanski"}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="p-6">
          <h3 className="font-serif text-2xl">Opis projekta</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{inquiry.brief}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-serif text-2xl">Kontakt i detalji</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <Detail label="Email" value={inquiry.email} />
            <Detail label="Telefon" value={inquiry.phone || "Nije navedeno"} />
            <Detail label="Dimenzije / količina" value={inquiry.dimensions || "Nije navedeno"} />
            <Detail label="Željeni rok" value={inquiry.deadline || "Nije navedeno"} />
          </dl>
          <a href={`mailto:${inquiry.email}`} className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground">Odgovori emailom</a>
        </Card>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt><dd className="mt-1 wrap-break-word">{value}</dd></div>
}
