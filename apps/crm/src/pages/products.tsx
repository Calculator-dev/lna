import { useQuery } from "@tanstack/react-query"
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
        columns={[{ key: "name", label: "Naziv" }, { key: "sku", label: "SKU" }, { key: "type", label: "Tip" }, { key: "price", label: "Cijena" }]}
        rowHref={row => `/products/${row.id}/edit`}
        emptyText="Još nema proizvoda. Dodajte prvi proizvod."
      />
    </>
  )
}
