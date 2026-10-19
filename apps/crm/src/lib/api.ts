import { dashboardView, inquiryRows, orderRows, productRows, type AdminDashboard, type AdminInquiryDetail, type AdminOrderDetail, type AdminProduct, type OrderDecisionResult, type ProductDetails } from "./admin-data"
import { apiUrl as API_URL, supabase } from "./auth"

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

type RequestOptions = { method: "POST" | "PUT"; body: unknown } | { method: "DELETE" }

async function fetchJson<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request(path, options)).json() as Promise<T>
}

async function request(path: string, options?: RequestOptions): Promise<Response> {
  if (!API_URL || !supabase) throw new Error("Administratorski servis nije konfigurisan")
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Potrebna je prijava")

  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "GET",
    body: options && "body" in options ? JSON.stringify(options.body) : undefined,
    headers: {
      // Only requests with a body declare one; the API rejects an empty JSON body.
      ...(options && "body" in options ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${data.session.access_token}`,
    },
  })

  if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event("admin-access-denied"))
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const fields = Array.isArray(body?.fields) ? `: ${body.fields.join(", ")}` : ""
    throw new ApiError(`${body?.message ?? "Zahtjev nije uspio"}${fields}`, response.status)
  }

  return response
}

/** One page of an admin list, newest first; pass `nextCursor` back to get the next one. */
export type Page<T> = { items: T[]; nextCursor: string | null }
export const PAGE_SIZE = 50

async function fetchPage<T, R>(path: string, toRows: (items: T[]) => R[], before?: string): Promise<Page<R>> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
  if (before) params.set("before", before)
  const response = await request(`${path}?${params}`)
  return { items: toRows(await response.json() as T[]), nextCursor: response.headers.get("X-Next-Cursor") }
}

export function getDashboard() {
  return fetchJson<AdminDashboard>("/admin/dashboard").then(dashboardView)
}

export function getProducts(before?: string) {
  return fetchPage("/admin/products", productRows, before)
}

export function getOrders(before?: string) {
  return fetchPage("/admin/orders", orderRows, before)
}

export function getOrder(id: string) {
  return fetchJson<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`)
}

export function decideOrder(id: string, body: { decision: "accept" } | { decision: "decline"; reason: string }) {
  return fetchJson<OrderDecisionResult>(`/admin/orders/${encodeURIComponent(id)}/decision`, { method: "PUT", body })
}

export function getInquiries(before?: string) {
  return fetchPage("/admin/inquiries", inquiryRows, before)
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

/** "deleted" when nobody ordered it; "archived" (hidden, kept for its orders) otherwise. */
export function deleteProduct(id: string) {
  return fetchJson<{ outcome: "deleted" | "archived" }>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" })
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
