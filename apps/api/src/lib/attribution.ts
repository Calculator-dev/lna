import { z } from "zod"

const text = z.string().trim().max(300).optional()

/**
 * Where an order or inquiry came from, as the storefront recorded it: campaign tags, ad click
 * IDs and the referring site. It's informational, so anything malformed is dropped rather
 * than failing the order.
 */
export const attributionInput = z.object({
  source: text, medium: text, campaign: text, term: text, content: text,
  gclid: text, fbclid: text, referrer: text, landingPath: text,
  capturedAt: z.string().datetime({ offset: true }).optional(),
}).optional().catch(undefined)

export type Attribution = NonNullable<z.infer<typeof attributionInput>>
