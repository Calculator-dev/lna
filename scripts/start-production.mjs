// Runs the API and the storefront together as one production service (one Render instance).
// The storefront listens on the public $PORT; the API listens privately on 127.0.0.1 and is
// reached by the storefront's server directly and by browsers through the storefront's
// /backend rewrite (see apps/storefront/next.config.mjs). Build first with `pnpm build:service`.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicPort = process.env.PORT || '3001'
const apiPort = process.env.API_INTERNAL_PORT || '4000'
if (publicPort === apiPort) throw new Error('PORT and API_INTERNAL_PORT must differ')

// Keep each heap well under the instance's memory so both processes fit (override per service).
const heap = (name, fallback) => `--max-old-space-size=${process.env[name] || fallback}`
const apps = [
  {
    name: 'API',
    directory: 'apps/api',
    args: [heap('API_HEAP_MB', 160), '--env-file-if-exists=.env', 'dist/server.js'],
    env: { PORT: apiPort, HOST: '127.0.0.1' },
  },
  {
    name: 'Storefront',
    directory: 'apps/storefront',
    args: [heap('STOREFRONT_HEAP_MB', 224), 'node_modules/next/dist/bin/next', 'start', '--port', publicPort, '--hostname', '0.0.0.0'],
    env: { PORT: publicPort, API_URL: `http://127.0.0.1:${apiPort}` },
  },
]

const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

for (const app of apps) {
  const child = spawn(process.execPath, app.args, {
    cwd: `${root}${app.directory}`,
    stdio: 'inherit',
    env: { ...process.env, ...app.env },
  })
  children.push(child)
  child.on('error', error => {
    console.error(`${app.name} failed to start: ${error.message}`)
    stop(1)
  })
  // If either process dies, stop the other too so the host restarts the whole service.
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${app.name} stopped (${signal ?? `exit ${code}`}). Stopping the service.`)
      stop(code || 1)
    }
  })
}
console.log(`Storefront on :${publicPort}, API on 127.0.0.1:${apiPort} (browsers reach it at /backend).`)
