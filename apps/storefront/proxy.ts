import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Skip API routes, the /backend proxy to the API (next.config.mjs), Next internals and files
  // with an extension (sitemap.xml, icons, images). Matchers must be literals, hence "backend".
  matcher: ["/((?!api/|backend/|_next/|.*\\..*).*)"],
}
