import { dashboardView, inquiryRows, orderRows, productRows, type AdminDashboard, type AdminInquiry, type AdminInquiryDetail, type AdminOrder, type AdminOrderDetail, type AdminProduct, type OrderDecisionResult, type ProductDetails } from "./admin-data"
import { apiUrl as API_URL, supabase } from "./auth"

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function fetchJson<T>(path: string, options?: { method: "POST" | "PUT"; body: unknown }): Promise<T> {
  if (!API_URL || !supabase) throw new Error("Administratorski servis nije konfigurisan")
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Potrebna je prijava")

  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "GET",
    body: options ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
  })

  if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event("admin-access-denied"))
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const fields = Array.isArray(body?.fields) ? `: ${body.fields.join(", ")}` : ""
    throw new ApiError(`${body?.message ?? "Zahtjev nije uspio"}${fields}`, response.status)
  }

  return response.json() as Promise<T>
}

export function getDashboard() {
  return fetchJson<AdminDashboard>("/admin/dashboard").then(dashboardView)
}

export function getProducts() {
  return fetchJson<AdminProduct[]>("/admin/products").then(productRows)
}

export function getOrders() {
  return fetchJson<AdminOrder[]>("/admin/orders").then(orderRows)
}

export function getOrder(id: string) {
  return fetchJson<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`)
}

export function decideOrder(id: string, body: { decision: "accept" } | { decision: "decline"; reason: string }) {
  return fetchJson<OrderDecisionResult>(`/admin/orders/${encodeURIComponent(id)}/decision`, { method: "PUT", body })
}

export function getInquiries() {
  return fetchJson<AdminInquiry[]>("/admin/inquiries").then(inquiryRows)
}

export function getInquiry(id: string) {
  return fetchJson<AdminInquiryDetail>(`/admin/inquiries/${encodeURIComponent(id)}`)
}

export type AdminCategory = { id: string; translations: Record<string, { name: string }> }
export function getCategories() {
  return fetchJson<AdminCategory[]>("/admin/categories")
}
export function createProduct(body: unknown) {
  return fetchJson<AdminProduct>("/admin/products", { method: "POST", body })
}

export function getProduct(id: string) {
  return fetchJson<ProductDetails>(`/admin/products/${encodeURIComponent(id)}`)
}
export function updateProduct(id: string, body: unknown) {
  return fetchJson<ProductDetails>(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", body })
}

export async function uploadProductImage(file: File): Promise<import("./admin-data").ProductImage> {
  if (!API_URL || !supabase) throw new Error("Administratorski servis nije konfigurisan")
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Potrebna je prijava")
  const response = await fetch(`${API_URL}/admin/media`, {
    method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": file.type }, body: file,
  })
  if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event("admin-access-denied"))
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? "Učitavanje slike nije uspjelo. Pokušajte ponovo.")
  }
  return response.json()
}
