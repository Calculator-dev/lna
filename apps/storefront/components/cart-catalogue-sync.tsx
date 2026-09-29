import { CartRepricer } from "@/components/cart-repricer"
import { getCartOffers } from "@/lib/catalogue"

/** Brings the stored cart in line with live prices and availability. */
export async function CartCatalogueSync() {
  try {
    const { offers, shipping } = await getCartOffers()
    return <CartRepricer offers={offers} shipping={shipping} />
  } catch {
    // The cart stays usable; the API validates every order anyway.
    return null
  }
}
