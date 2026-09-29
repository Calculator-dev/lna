import "server-only"

/** API base URL for server-side requests. Localhost is only a development default. */
export function serverApiUrl() {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000")
  if (!url) throw new Error("API_URL is not configured")
  return url.replace(/\/$/, "")
}
