import type { Attribution } from "../lib/admin-data"
import { Card } from "./ui/card"

/** Where an order or inquiry came from: campaign tags, ad clicks or the referring site. */
export function AttributionCard({ attribution }: { attribution?: Attribution | null }) {
  const rows = attribution ? ([
    ["Kampanja", attribution.campaign],
    ["Izvor / medij", [attribution.source, attribution.medium].filter(Boolean).join(" / ")],
    ["Sadržaj", attribution.content],
    ["Ključna riječ", attribution.term],
    ["Klik na oglas", [attribution.gclid && "Google Ads", attribution.fbclid && "Meta"].filter(Boolean).join(", ")],
    ["Stigao sa", attribution.referrer],
    ["Prva stranica", attribution.landingPath],
  ] satisfies Array<[string, string | undefined]>).filter((row): row is [string, string] => Boolean(row[1])) : []
  return (
    <Card className="p-6">
      <h3 className="font-serif text-2xl">Izvor posjete</h3>
      {rows.length ? (
        <dl className="mt-5 space-y-3 text-sm">
          {rows.map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt><dd className="mt-1 wrap-break-word">{value}</dd></div>)}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Direktna posjeta ili izvor nije poznat.</p>
      )}
    </Card>
  )
}
