import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Skip API routes, /backend (the API, in the combined production server), Next internals and
  // files with an extension (sitemap.xml, icons, images). Matchers must be literals.
  matcher: ["/((?!api/|backend/|_next/|.*\\..*).*)"],
}
