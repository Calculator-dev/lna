import { serverApiUrl } from "@/lib/api-url"

// Streams a product image from private storage. Uploaded images are never modified (a new
// upload gets a new ID), so responses can be cached; the day-long lifetime lets images that
// are removed from a product drop out of caches. Serving bytes rather than redirecting to
// the short-lived signed URL also lets next/image optimize them.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 })
  try {
    const response = await fetch(`${serverApiUrl()}/public/media/${id}`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
    if (response.status === 404) return new Response(null, { status: 404 })
    if (!response.ok || !response.body) return new Response(null, { status: 502 })
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/webp",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return new Response(null, { status: 502 })
  }
}
