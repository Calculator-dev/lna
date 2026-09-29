import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { DataTable } from "../components/data-table"
import { OrderDetails } from "../components/order-details"
import { PageHeader } from "../components/page-header"
import { getOrders } from "../lib/api"

export function OrdersPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: getOrders })
  return (
    <>
      <PageHeader eyebrow="Prodaja" title="Narudžbe" description="Pregledajte narudžbe s ručnim plaćanjem, pratite proizvodnju i spremnost za dostavu." />
      <DataTable
        query={query}
        columns={[{ key: "orderNumber", label: "Narudžba" }, { key: "customer", label: "Kupac" }, { key: "status", label: "Status" }, { key: "amount", label: "Iznos" }, { key: "createdAt", label: "Datum" }]}
        rowHref={row => `/orders/${row.id}`}
        actionLabel="Detalji"
        emptyText="Još nema narudžbi."
      />
    </>
  )
}

export function OrderPage() {
  const navigate = useNavigate()
  const { id = "" } = useParams()
  return <OrderDetails id={id} onBack={() => navigate("/orders")} />
}
