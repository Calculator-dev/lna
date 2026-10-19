import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { deleteProduct } from "../lib/api"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

/** Deletes a product after a confirmation step; see the API for when it's archived instead. */
export function DeleteProduct({ id, name, onDeleted }: { id: string; name: string; onDeleted: (notice: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: ({ outcome }) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.removeQueries({ queryKey: ["product", id] })
      onDeleted(outcome === "deleted"
        ? `Proizvod „${name}” je obrisan.`
        : `Proizvod „${name}” je uklonjen iz prodavnice. Ostaje sačuvan u postojećim narudžbama, a njegov SKU se ne može ponovo koristiti.`)
    },
  })
  return (
    <Card className="mt-8 border-red-200 p-6">
      <h3 className="font-serif text-2xl">Obriši proizvod</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Proizvod nestaje iz prodavnice i liste proizvoda. Ako je već naručen, ostaje sačuvan u tim narudžbama.
      </p>
      {mutation.isError && <p role="alert" className="mt-4 text-sm text-red-700">Brisanje nije uspjelo: {mutation.error.message}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {confirming ? (
          <>
            <Button className="bg-red-700 text-white" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Brisanje…" : "Da, obriši proizvod"}
            </Button>
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setConfirming(false)}>Odustani</Button>
          </>
        ) : (
          <Button variant="outline" className="border-red-300 text-red-700" onClick={() => setConfirming(true)}>Obriši proizvod</Button>
        )}
      </div>
    </Card>
  )
}
