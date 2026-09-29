import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { DataTable } from "../components/data-table"
import { InquiryDetails } from "../components/inquiry-details"
import { PageHeader } from "../components/page-header"
import { getInquiries } from "../lib/api"

export function InquiriesPage() {
  const query = useQuery({ queryKey: ["inquiries"], queryFn: getInquiries })
  return (
    <>
      <PageHeader eyebrow="Prodaja" title="Upiti za izradu po mjeri" description="Zahtjevi za personalizirane proizvode poslani putem webshopa." />
      <DataTable
        query={query}
        columns={[{ key: "fullName", label: "Ime" }, { key: "createdAt", label: "Datum" }, { key: "email", label: "Email" }, { key: "brief", label: "Upit" }, { key: "deadline", label: "Rok" }]}
        rowHref={row => `/inquiries/${row.id}`}
        actionLabel="Detalji"
        emptyText="Još nema upita."
      />
    </>
  )
}

export function InquiryPage() {
  const navigate = useNavigate()
  const { id = "" } = useParams()
  return <InquiryDetails id={id} onBack={() => navigate("/inquiries")} />
}
