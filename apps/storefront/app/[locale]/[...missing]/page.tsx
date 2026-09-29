import { notFound } from "next/navigation"

// Unmatched URLs render the localized not-found page inside the site layout.
export default function Page() {
  notFound()
}
