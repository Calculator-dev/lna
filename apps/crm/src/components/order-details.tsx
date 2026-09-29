import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, Mail, X } from "lucide-react"
import { decideOrder, getOrder } from "../lib/api"
import { localizedOrderStatus } from "../lib/admin-data"
import { formatDateTime, formatMoney } from "../lib/format"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

const money = formatMoney
const date = formatDateTime

export function OrderDetails({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id) })
  const [declining, setDeclining] = useState(false)
  const [message, setMessage] = useState("")
  const [confirmingAccept, setConfirmingAccept] = useState(false)
  const [reasonError, setReasonError] = useState("")
  const mutation = useMutation({
    mutationFn: (body: { decision: "accept" } | { decision: "decline"; reason: string }) => decideOrder(id, body),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["order", id] })
      setDeclining(false)
      setConfirmingAccept(false)
      setMessage(result.notification.sent
        ? "Odluka je sačuvana i kupcu je poslan email."
        : result.notification.reason === "not_configured"
          ? "Odluka je sačuvana, ali email servis još nije konfigurisan."
          : "Odluka je sačuvana, ali email nije isporučen. Pokušajte kontaktirati kupca direktno.")
    },
  })

  function decline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim()
    if (reason.length < 5) { setReasonError("Obrazloženje mora imati najmanje 5 znakova."); return }
    setReasonError("")
    mutation.mutate({ decision: "decline", reason })
  }

  if (query.isPending) return <p role="status" className="mt-6">Učitavanje narudžbe…</p>
  if (!query.data) return <p role="alert" className="mt-6 text-destructive">Detalje narudžbe nije moguće učitati.</p>
  const order = query.data
  const canReview = order.status === "submitted"

  return (
    <div className="space-y-6 pt-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Nazad na narudžbe
      </button>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Detalji narudžbe</p>
          <h1 id="page-title" tabIndex={-1} className="mt-2 font-serif text-4xl outline-none">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kreirana {date(order.createdAt)}</p>
        </div>
        <span className="w-fit rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">{localizedOrderStatus(order.status)}</span>
      </div>

      {message && <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">{message}</p>}
      {mutation.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Odluku nije moguće sačuvati: {mutation.error.message}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="p-6">
          <h3 className="font-serif text-2xl">Proizvodi</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-140 text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="pb-3 font-medium">Proizvod</th><th className="pb-3 font-medium">Količina</th><th className="pb-3 text-right font-medium">Cijena</th><th className="pb-3 text-right font-medium">Ukupno</th></tr></thead>
              <tbody>{order.items.map(item => <tr key={item.id} className="border-t border-border">
                <td className="py-4"><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.sku}</p>{item.personalization && <p className="mt-2 text-xs">Personalizacija: {item.personalization}</p>}</td>
                <td className="py-4">{item.quantity}</td><td className="py-4 text-right">{money(item.unitPrice)}</td><td className="py-4 text-right font-medium">{money(item.unitPrice * item.quantity)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <dl className="ml-auto max-w-xs space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Proizvodi</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Dostava</dt><dd>{order.shippingAmount === 0 ? "Besplatna" : money(order.shippingAmount)}</dd></div>
            <div className="flex items-baseline justify-between gap-6"><dt className="text-muted-foreground">Ukupno</dt><dd className="font-serif text-3xl">{money(order.amount)}</dd></div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="p-6"><h3 className="font-serif text-2xl">Kupac</h3><dl className="mt-5 space-y-3 text-sm"><Detail label="Ime" value={order.customer.fullName} /><Detail label="Email" value={order.customer.email} /><Detail label="Telefon" value={order.customer.phone || "Nije navedeno"} /><Detail label="Potvrda narudžbe" value={order.confirmationEmailSentAt ? `Poslana ${date(order.confirmationEmailSentAt)}` : "Email nije poslan"} /></dl></Card>
          <Card className="p-6"><h3 className="font-serif text-2xl">Dostava</h3><p className="mt-5 text-sm leading-7">{order.shippingAddress.address}<br />{[order.shippingAddress.postalCode, order.shippingAddress.city].filter(Boolean).join(" ")}<br />{order.shippingAddress.country}</p>{order.notes && <><p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">Napomena</p><p className="mt-2 text-sm leading-6">{order.notes}</p></>}</Card>
        </div>
      </div>

      {canReview && <Card className="p-6">
        <h3 className="font-serif text-2xl">Odluka o narudžbi</h3>
        <p className="mt-2 text-sm text-muted-foreground">Prihvatite narudžbu ili unesite obrazloženje prije odbijanja. Kupac će dobiti email s odlukom.</p>
        {!declining ? <div className="mt-6 flex flex-wrap gap-3">
          {confirmingAccept ? <>
            <p className="w-full text-sm">Kupac će odmah dobiti email da je narudžba prihvaćena. Nastaviti?</p>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ decision: "accept" })}><Check className="mr-2 h-4 w-4" />{mutation.isPending ? "Slanje…" : "Da, prihvati i pošalji email"}</Button>
            <Button variant="ghost" disabled={mutation.isPending} onClick={() => setConfirmingAccept(false)}>Odustani</Button>
          </> : <>
            <Button disabled={mutation.isPending} onClick={() => setConfirmingAccept(true)}><Check className="mr-2 h-4 w-4" />Prihvati narudžbu</Button>
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setDeclining(true)} className="border-red-300 text-red-700 hover:bg-red-50"><X className="mr-2 h-4 w-4" />Odbij narudžbu</Button>
          </>}
        </div> : <form onSubmit={decline} className="mt-6 max-w-2xl">
          <label htmlFor="reason" className="text-sm font-medium">Obrazloženje za kupca</label>
          <textarea id="reason" name="reason" required minLength={5} maxLength={2000} rows={5} className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Objasnite zašto narudžbu nije moguće prihvatiti…" />
          {reasonError && <p role="alert" className="mt-2 text-sm text-destructive">{reasonError}</p>}
          <div className="mt-3 flex gap-3"><Button type="submit" disabled={mutation.isPending} className="bg-red-700 hover:bg-red-800"><Mail className="mr-2 h-4 w-4" />{mutation.isPending ? "Slanje…" : "Odbij i pošalji objašnjenje"}</Button><Button type="button" variant="ghost" onClick={() => setDeclining(false)}>Odustani</Button></div>
        </form>}
      </Card>}

      {!canReview && <Card className="p-6"><h3 className="font-serif text-2xl">Odluka je zaključena</h3><p className="mt-2 text-sm text-muted-foreground">Narudžba je {localizedOrderStatus(order.status).toLowerCase()} {order.reviewedAt ? `dana ${date(order.reviewedAt)}` : ""}.</p>{order.declineReason && <div className="mt-5 border-l-2 border-red-300 pl-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Obrazloženje odbijanja</p><p className="mt-2 text-sm leading-6">{order.declineReason}</p></div>}<p className="mt-4 text-xs text-muted-foreground">{order.reviewEmailSentAt ? `Email poslan ${date(order.reviewEmailSentAt)}.` : "Email kupcu nije zabilježen kao poslan."}</p></Card>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt><dd className="mt-1 wrap-break-word">{value}</dd></div>
}
