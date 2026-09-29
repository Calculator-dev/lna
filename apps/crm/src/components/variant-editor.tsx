import type { Dispatch, SetStateAction } from "react"
import { Plus, Trash2 } from "lucide-react"
import { newVariantDraft, type VariantDraft } from "../lib/product-draft"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Field } from "./ui/field"
import { Input } from "./ui/input"

export function VariantEditor({ variants, onChange, mainDimensions }: {
  variants: VariantDraft[]
  onChange: Dispatch<SetStateAction<VariantDraft[]>>
  /** The first variant always uses the product's main dimensions. */
  mainDimensions: string
}) {
  const update = (key: string, patch: Partial<VariantDraft>) =>
    onChange(current => current.map(variant => variant.key === key ? { ...variant, ...patch } : variant))
  const remove = (key: string) =>
    onChange(current => current.length <= 1 ? current : current.filter(variant => variant.key !== key))

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl">Varijante i cijene</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Prva varijanta je osnovna i koristi se kao glavna cijena proizvoda i glavne dimenzije.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange(current => [...current, newVariantDraft()])}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj varijantu
        </Button>
      </div>
      <div className="space-y-4">
        {variants.map((variant, index) => (
          <div key={variant.key} role="group" aria-label={`Varijanta ${index + 1}`} className="space-y-4 rounded-lg border border-border/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Varijanta {index + 1}{index === 0 ? " (osnovna)" : ""}
              </p>
              <Button
                type="button"
                variant="ghost"
                disabled={variants.length <= 1}
                onClick={() => remove(variant.key)}
                className="text-destructive hover:text-destructive"
                aria-label={`Ukloni varijantu ${index + 1}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Ukloni
              </Button>
            </div>
            <div className="grid items-start gap-4 sm:grid-cols-3">
              <Field label="SKU *" hint="Jedinstvena šifra varijante.">
                <Input
                  required
                  maxLength={80}
                  pattern="[A-Za-z0-9_-]+"
                  placeholder="LNA-MONO-01-30"
                  value={variant.sku}
                  onChange={event => update(variant.key, { sku: event.target.value })}
                />
              </Field>
              <Field label="Dimenzije *">
                <Input
                  required
                  maxLength={200}
                  placeholder="npr. 30 × 30 cm"
                  value={index === 0 ? mainDimensions : variant.dimensions}
                  readOnly={index === 0}
                  onChange={index === 0 ? undefined : event => update(variant.key, { dimensions: event.target.value })}
                />
              </Field>
              <Field label="Cijena (KM) *" hint="Cijene su u cijelim KM.">
                <Input
                  required
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  placeholder="45"
                  value={variant.price}
                  onChange={event => update(variant.key, { price: event.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={variant.active}
                onChange={event => update(variant.key, { active: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Aktivna varijanta
            </label>
          </div>
        ))}
      </div>
    </Card>
  )
}
