import { useQuery } from "@tanstack/react-query"
import { getProduct } from "../lib/api"
import { ProductForm } from "./product-form"
import { Button } from "./ui/button"

export function EditProduct({ id, onCancel, onSaved }: { id: string; onCancel: () => void; onSaved: () => void }) {
  const query = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id), retry: false })
  if (query.isPending) return <p role="status" className="py-8">Učitavanje proizvoda…</p>
  // A failed background refetch keeps the loaded data; only block the form when nothing loaded.
  if (!query.data) return <div className="space-y-4 py-8"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Pokušaj ponovo</Button> <Button variant="outline" onClick={onCancel}>Nazad na proizvode</Button></div>
  return <ProductForm key={id} product={query.data} onCancel={onCancel} onSaved={onSaved} />
}
