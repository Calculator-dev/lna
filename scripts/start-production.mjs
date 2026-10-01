// Runs the API and the storefront in one process on one port (one Render instance).
// Requests under /backend go to the API (with the prefix removed); everything else goes to the
// Next.js storefront. Serving a single port matters on Render, which routes to whichever port
// it detects. Build first with `pnpm build:service` (with NEXT_PUBLIC_API_URL=/backend).
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const port = process.env.PORT || '3001'
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error(`PORT must be a port number between 1 and 65535 (got "${port}").`)
  process.exit(1)
}
const prefix = '/backend'
process.env.NODE_ENV ||= 'production'
// The storefront's server-side requests (catalogue, images) loop back through this same port.
process.env.API_URL = `http://127.0.0.1:${port}${prefix}`

// The API validates its environment on import, so a misconfiguration stops startup here.
const { createApp } = await import('../apps/api/dist/app.js')
const api = createApp()
await api.ready()

// Resolve Next.js from the storefront package (pnpm keeps it out of the root node_modules).
const next = createRequire(`${root}apps/storefront/package.json`)('next')
const storefront = next({ dev: false, dir: `${root}apps/storefront`, hostname: '0.0.0.0', port: Number(port) })
await storefront.prepare()
const handleStorefront = storefront.getRequestHandler()

const server = createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
    req.url = url.slice(prefix.length) || '/'
    if (req.url.startsWith('?')) req.url = `/${req.url}`
    api.routing(req, res)
    return
  }
  handleStorefront(req, res).catch(error => {
    console.error('Storefront request failed', error)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
})

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Storefront and API on :${port} (API under ${prefix}).`)
})

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  server.close()
  await Promise.allSettled([api.close(), storefront.close?.()])
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
