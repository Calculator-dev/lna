import { timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"
import { CATALOGUE_TAG } from "@/lib/catalogue"

// Called by the API after a CRM product save, with the secret both sides share.
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) return new Response(null, { status: 404 })
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return new Response(null, { status: 401 })
  revalidateTag(CATALOGUE_TAG, { expire: 0 })
  return new Response(null, { status: 204 })
}
