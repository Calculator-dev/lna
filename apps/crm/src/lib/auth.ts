import { createClient } from "@supabase/supabase-js"

const url = import.meta.env?.VITE_SUPABASE_URL
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null
export const apiUrl = import.meta.env?.VITE_API_URL?.replace(/\/$/, "")

let adminVerification: { token: string; promise: Promise<void> } | null = null

export function resetAdminVerification() {
  adminVerification = null
}

export function verifyAdmin(accessToken: string) {
  if (adminVerification?.token === accessToken) return adminVerification.promise
  if (!apiUrl) return Promise.reject(new Error("Administratorski servis nije konfigurisan."))
  const promise = fetch(`${apiUrl}/admin/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(response => {
    if (!response.ok) throw new Error(response.status === 403 ? "Ovaj račun nema administratorski pristup." : response.status === 401 ? "Vaša sesija je istekla. Prijavite se ponovo." : "Nije moguće potvrditi administratorski pristup. Pokušajte ponovo.")
  }).catch(error => {
    if (adminVerification?.token === accessToken) adminVerification = null
    throw error
  })
  adminVerification = { token: accessToken, promise }
  return promise
}
