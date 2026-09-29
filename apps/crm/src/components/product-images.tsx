import { useState, type Dispatch, type SetStateAction } from "react"
import { uploadProductImage } from "../lib/api"
import type { ProductImage } from "../lib/admin-data"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export function ProductImages({ images, onChange, onBusy, disabled }: {
  images: ProductImage[]; onChange: Dispatch<SetStateAction<ProductImage[]>>; onBusy: (busy: boolean) => void; disabled: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function upload(files: FileList | null) {
    if (!files?.length || busy || disabled) return
    setError("")
    const selected = Array.from(files)
    if (images.length + selected.length > 8) { setError("Možete dodati najviše 8 slika po proizvodu."); return }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0)) {
      setError("Odaberite JPEG, PNG ili WebP datoteke manje od 10 MB."); return
    }
    setBusy(true)
    onBusy(true)
    try {
      for (const file of selected) {
        const uploaded = await uploadProductImage(file)
        onChange(current => [...current, { ...uploaded, isPrimary: current.length === 0 }])
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Učitavanje slike nije uspjelo. Pokušajte ponovo.") }
    finally { setBusy(false); onBusy(false) }
  }
  const blocked = disabled || busy
  return <Card className="space-y-5 p-6">
    <div><h3 className="font-serif text-2xl">Slike proizvoda</h3><p className="mt-2 text-sm text-muted-foreground">Dodajte najviše 8 fotografija. Podržani su JPEG, PNG i WebP formati do 10 MB po slici. Sačuvajte proizvod kako biste zadržali izmjene.</p></div>
    <label className="block space-y-2 text-sm font-medium"><span>Dodaj slike</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={blocked || images.length >= 8} className="block w-full text-sm file:mr-4 file:rounded-md file:border file:bg-background file:px-4 file:py-2" onChange={event => { void upload(event.target.files); event.target.value = "" }} /></label>
    {busy && <p role="status" className="text-sm">Učitavanje slika…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {images.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Još nema slika. Dodajte fotografije proizvoda.</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image, index) => <div key={image.id} className="space-y-3 rounded-lg border p-3">
        <div className="relative aspect-4/3 overflow-hidden rounded-md bg-muted"><img src={image.url} alt={image.alt.bs || `Slika proizvoda ${index + 1}`} className="h-full w-full object-contain" />{image.isPrimary && <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Glavna</span>}</div>
        <label className="block space-y-1 text-xs"><span>Opis na bosanskom</span><Input disabled={blocked} value={image.alt.bs} maxLength={300} placeholder="Opišite ovu sliku" onChange={event => onChange(current => current.map(item => item.id === image.id ? { ...item, alt: { ...item.alt, bs: event.target.value } } : item))} /></label>
        <label className="block space-y-1 text-xs"><span>Opis na engleskom</span><Input disabled={blocked} value={image.alt.en} maxLength={300} placeholder="Opcionalni opis na engleskom" onChange={event => onChange(current => current.map(item => item.id === image.id ? { ...item, alt: { ...item.alt, en: event.target.value } } : item))} /></label>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={blocked || image.isPrimary} onClick={() => onChange(current => current.map(item => ({ ...item, isPrimary: item.id === image.id })))}>Postavi kao glavnu</Button><Button type="button" variant="outline" disabled={blocked} onClick={() => onChange(current => {
          const remaining = current.filter(item => item.id !== image.id)
          return remaining.map((item, i) => ({ ...item, isPrimary: image.isPrimary ? i === 0 : item.isPrimary }))
        })}>Ukloni</Button></div>
      </div>)}
    </div>
  </Card>
}
