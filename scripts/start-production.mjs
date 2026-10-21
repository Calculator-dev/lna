// Runs the API and the storefront in one process on one port (one Render instance).
// Requests under /backend go to the API (with the prefix removed); everything else goes to the
// Next.js storefront. Serving a single port matters on Render, which routes to whichever port
// it detects. Build first with `pnpm build:service` (with NEXT_PUBLIC_API_URL=/backend).
import { randomBytes } from 'node:crypto'
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
// After CRM saves, the API tells the storefront (in this same process) to drop its cached
// catalogue. A secret made at startup is enough, since nothing outside the process needs it.
process.env.STOREFRONT_REVALIDATE_URL = `http://127.0.0.1:${port}/api/revalidate`
process.env.REVALIDATE_SECRET ||= randomBytes(32).toString('hex')

// The API validates its environment on import, so a misconfiguration stops startup here.
const { createApp } = await import('../apps/api/dist/app.js')
const { startEmailWorker } = await import('../apps/api/dist/services/email-outbox.js')
const api = createApp()
// Sends queued order and inquiry emails from this process.
startEmailWorker(api)
await api.ready()

// Resolve Next.js from the storefront package (pnpm keeps it out of the root node_modules).
const next = createRequire(`${root}apps/storefront/package.json`)('next')
const storefront = next({ dev: false, dir: `${root}apps/storefront`, hostname: '0.0.0.0', port: Number(port) })
await storefront.prepare()
const handleStorefront = storefront.getRequestHandler()

// Resizing a photo can take 100+ MB while it runs, and a cold image cache (after every deploy
// or restart) gets many requests at once, which overflowed the instance's memory. At most this
// many resizes run together; the rest wait their turn. Cached images are served just as fast.
const MAX_IMAGE_JOBS = 2
let imageJobs = 0
const waitingImageJobs = []
function limitImageJob(res, run) {
  const start = () => {
    imageJobs++
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      imageJobs--
      waitingImageJobs.shift()?.()
    }
    res.once('close', finish)
    res.once('finish', finish)
    run()
  }
  if (imageJobs < MAX_IMAGE_JOBS) start()
  else waitingImageJobs.push(start)
}

const server = createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
    req.url = url.slice(prefix.length) || '/'
    if (req.url.startsWith('?')) req.url = `/${req.url}`
    api.routing(req, res)
    return
  }
  const serve = () => handleStorefront(req, res).catch(error => {
    console.error('Storefront request failed', error)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
  if (url.startsWith('/_next/image')) limitImageJob(res, serve)
  else serve()
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
