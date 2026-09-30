import { useQuery } from "@tanstack/react-query"
import { ImageOff } from "lucide-react"
import { Link, useLocation } from "react-router"
import { DataTable } from "../components/data-table"
import { PageHeader } from "../components/page-header"
import { buttonVariants } from "../components/ui/button"
import { getProducts } from "../lib/api"

export function ProductsPage() {
  const query = useQuery({ queryKey: ["products"], queryFn: getProducts })
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  return (
    <>
      <PageHeader
        eyebrow="Katalog"
        title="Proizvodi"
        description="Upravljajte proizvodima, prevodima, materijalima, cijenama, istaknutim statusom i tipovima proizvoda."
        actions={<Link to="/products/new" className={buttonVariants()}>Novi proizvod</Link>}
      />
      {notice && <p role="status" className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">{notice}</p>}
      <DataTable
        query={query}
        columns={[
          { key: "image", label: "Slike", render: row => <ProductThumbnail url={row.image} alt={row.imageAlt || row.name} /> },
          { key: "name", label: "Naziv" },
          { key: "sku", label: "SKU" },
          { key: "type", label: "Tip" },
          { key: "price", label: "Cijena" },
        ]}
        rowHref={row => `/products/${row.id}/edit`}
        emptyText="Još nema proizvoda. Dodajte prvi proizvod."
      />
    </>
  )
}

function ProductThumbnail({ url, alt }: { url: string; alt: string }) {
  if (!url) {
    return (
      <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground" title="Nema glavne slike">
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="sr-only">Nema glavne slike</span>
      </span>
    )
  }
  return <img src={url} alt={alt} loading="lazy" decoding="async" width={56} height={56} className="h-14 w-14 rounded-lg border border-border bg-muted object-cover" />
}
