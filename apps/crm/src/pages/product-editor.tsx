import { useNavigate, useParams } from "react-router"
import { EditProduct } from "../components/edit-product"
import { ProductForm } from "../components/product-form"

export function NewProductPage() {
  const navigate = useNavigate()
  return <ProductForm onCancel={() => navigate("/products")} onSaved={() => navigate("/products", { state: { notice: "Proizvod je uspješno sačuvan." } })} />
}

export function EditProductPage() {
  const navigate = useNavigate()
  const { id = "" } = useParams()
  return <EditProduct id={id} onCancel={() => navigate("/products")} onSaved={() => navigate("/products", { state: { notice: "Proizvod je uspješno ažuriran." } })} />
}
